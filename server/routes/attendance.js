import { Router } from 'express';
import {
  requireAuth,
  requireRole,
  supabaseAdmin,
} from '../middleware/auth.js';
import {
  computeSlot,
  signAttendanceToken,
  parseAttendanceToken,
  verifyAttendanceToken,
  buildQrUrl,
} from '../services/attendanceTokens.js';
import {
  ATTENDANCE_PURPOSES,
  UUID_REGEX,
  sendOk,
  sendError,
  computeEffectiveStatus,
  validateScanLocation,
  escapeCsvCell,
  SlidingWindowLimiter,
  createSupabaseAttendanceStore,
} from '../services/attendanceService.js';

function rejectUnknownFields(body, allowedFields) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return ['Request body must be a JSON object'];
  }
  const unknown = Object.keys(body).filter((k) => !allowedFields.includes(k));
  return unknown;
}

export function createAttendanceRouter({
  store,
  requireAuthMiddleware = requireAuth,
  requireRoleMiddleware = requireRole,
} = {}) {
  const router = Router();
  const dataStore =
    store ||
    createSupabaseAttendanceStore((req) => {
      if (!supabaseAdmin) {
        const err = new Error(
          'Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (supabaseAdminReady=false). Configure both in Railway Variables.'
        );
        err.statusCode = 503;
        err.code = 'SERVER_NOT_CONFIGURED';
        throw err;
      }
      return req.supabase || supabaseAdmin;
    });

  const scanPerStudentMax = Number(process.env.ATTENDANCE_SCAN_RATE_PER_MIN) || 10;
  const scanStudentLimiter = new SlidingWindowLimiter({ windowMs: 60_000, max: scanPerStudentMax });
  const scanIpLimiter = new SlidingWindowLimiter({ windowMs: 60_000, max: 60 });
  const qrLimiter = new SlidingWindowLimiter({ windowMs: 60_000, max: 30 });
  const rejectedAuditLimiter = new SlidingWindowLimiter({ windowMs: 60_000, max: 5 });

  const defaultRotateSeconds = Math.min(
    120,
    Math.max(15, Number(process.env.ATTENDANCE_DEFAULT_ROTATE_SECONDS) || 30)
  );

  // Helper: ensure coordinator is assigned to visitId
  async function assertStaffVisitAccess(req, res, visitId) {
    if (req.user.role === 'admin') return true;
    if (req.user.role === 'coordinator') {
      const assigned = await dataStore.isCoordinatorForVisit(req, req.user.id, visitId);
      if (!assigned) {
        sendError(res, 403, 'FORBIDDEN', "You don't have permission to access this visit.");
        return false;
      }
      return true;
    }
    sendError(res, 403, 'FORBIDDEN');
    return false;
  }

  // All attendance routes require authentication
  router.use(requireAuthMiddleware);

  // ===========================================================================
  // ADMIN — SESSION MANAGEMENT
  // ===========================================================================

  router.get('/visits', requireRoleMiddleware('admin'), async (req, res) => {
    try {
      if (req.user.role !== 'admin') return sendError(res, 403, 'FORBIDDEN');
      const visits = await dataStore.listVisits(req);
      return sendOk(res, visits);
    } catch (err) {
      console.error('[Attendance Visits Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message || 'Failed to load industrial visits.');
    }
  });

  router.post('/sessions', requireRoleMiddleware('admin'), async (req, res) => {
    try {
      if (req.user.role !== 'admin') return sendError(res, 403, 'FORBIDDEN');
      const allowed = [
        'visitId',
        'title',
        'purpose',
        'details',
        'closesAt',
        'rotateSeconds',
        'requireLocation',
        'geo',
      ];
      const unknown = rejectUnknownFields(req.body, allowed);
      if (unknown.length > 0) {
        return sendError(res, 400, 'VALIDATION_ERROR', `Unknown fields: ${unknown.join(', ')}`);
      }

      const {
        visitId,
        title,
        purpose,
        details,
        closesAt,
        rotateSeconds = defaultRotateSeconds,
        requireLocation = false,
        geo,
      } = req.body;

      if (!visitId || !UUID_REGEX.test(String(visitId))) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Valid visitId is required.');
      }
      const cleanTitle = typeof title === 'string' ? title.trim() : '';
      if (cleanTitle.length < 3 || cleanTitle.length > 120) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Title must be between 3 and 120 characters.');
      }
      if (!ATTENDANCE_PURPOSES.includes(purpose)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid attendance purpose.');
      }
      if (details !== undefined && details !== null) {
        if (typeof details !== 'string' || details.length > 1000) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'Details must be 1000 characters or fewer.');
        }
      }

      let parsedClosesAt = null;
      if (closesAt !== undefined && closesAt !== null && closesAt !== '') {
        const d = new Date(closesAt);
        if (Number.isNaN(d.getTime())) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid closesAt date.');
        }
        parsedClosesAt = d.toISOString();
      }

      const rot = Number(rotateSeconds);
      if (!Number.isInteger(rot) || rot < 15 || rot > 120) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'rotateSeconds must be an integer between 15 and 120.');
      }

      if (typeof requireLocation !== 'boolean') {
        return sendError(res, 400, 'VALIDATION_ERROR', 'requireLocation must be a boolean.');
      }

      let cleanGeo = null;
      if (geo !== undefined && geo !== null) {
        if (
          typeof geo !== 'object' ||
          typeof geo.lat !== 'number' ||
          typeof geo.lng !== 'number' ||
          !Number.isFinite(geo.lat) ||
          !Number.isFinite(geo.lng)
        ) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid geo coordinates.');
        }
        const radiusM = geo.radiusM !== undefined ? Number(geo.radiusM) : 150;
        if (!Number.isInteger(radiusM) || radiusM < 20 || radiusM > 5000) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'geo.radiusM must be between 20 and 5000.');
        }
        cleanGeo = { lat: geo.lat, lng: geo.lng, radiusM };
      }

      const visit = await dataStore.getVisit(req, visitId);
      if (!visit) {
        return sendError(res, 404, 'NOT_FOUND', 'Visit not found.');
      }

      const actorId = await dataStore.resolveActorUuid(req);
      const session = await dataStore.createSession(req, {
        visitId,
        title: cleanTitle,
        purpose,
        details: details ? details.trim() : null,
        closesAt: parsedClosesAt,
        rotateSeconds: rot,
        requireLocation,
        geo: cleanGeo,
        createdBy: actorId,
      });

      return sendOk(res, { ...session, effectiveStatus: computeEffectiveStatus(session) }, 201);
    } catch (err) {
      console.error('[Attendance Create Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message || 'Failed to create attendance session.');
    }
  });

  router.patch('/sessions/:id', requireRoleMiddleware('admin'), async (req, res) => {
    try {
      if (req.user.role !== 'admin') return sendError(res, 403, 'FORBIDDEN');
      if (!UUID_REGEX.test(req.params.id)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid session ID.');

      const unknown = rejectUnknownFields(req.body, ['title', 'details', 'closesAt']);
      if (unknown.length > 0) {
        return sendError(res, 400, 'VALIDATION_ERROR', `Cannot modify fields: ${unknown.join(', ')}`);
      }

      const session = await dataStore.getSessionById(req, req.params.id);
      if (!session) return sendError(res, 404, 'NOT_FOUND');

      const updates = {};
      if (req.body.title !== undefined) {
        const t = typeof req.body.title === 'string' ? req.body.title.trim() : '';
        if (t.length < 3 || t.length > 120) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'Title must be between 3 and 120 characters.');
        }
        updates.title = t;
      }
      if (req.body.details !== undefined) {
        if (req.body.details !== null && (typeof req.body.details !== 'string' || req.body.details.length > 1000)) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'Details must be 1000 characters or fewer.');
        }
        updates.details = req.body.details ? req.body.details.trim() : null;
      }
      if (req.body.closesAt !== undefined) {
        if (req.body.closesAt === null || req.body.closesAt === '') {
          updates.closes_at = null;
        } else {
          const d = new Date(req.body.closesAt);
          if (Number.isNaN(d.getTime())) {
            return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid closesAt date.');
          }
          updates.closes_at = d.toISOString();
        }
      }

      const actorId = await dataStore.resolveActorUuid(req);
      const updated = await dataStore.updateSession(req, req.params.id, updates, actorId, 'session_updated');
      return sendOk(res, { ...updated, effectiveStatus: computeEffectiveStatus(updated) });
    } catch (err) {
      console.error('[Attendance Patch Error]:', err);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to update session.');
    }
  });

  router.post('/sessions/:id/close', requireRoleMiddleware('admin'), async (req, res) => {
    try {
      if (req.user.role !== 'admin') return sendError(res, 403, 'FORBIDDEN');
      if (!UUID_REGEX.test(req.params.id)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid session ID.');
      const session = await dataStore.getSessionById(req, req.params.id);
      if (!session) return sendError(res, 404, 'NOT_FOUND');

      const actorId = await dataStore.resolveActorUuid(req);
      const updated = await dataStore.updateSession(
        req,
        req.params.id,
        {
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: actorId,
        },
        actorId,
        'session_closed'
      );
      return sendOk(res, { ...updated, effectiveStatus: computeEffectiveStatus(updated) });
    } catch (err) {
      console.error('[Attendance Close Error]:', err);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to close session.');
    }
  });

  router.post('/sessions/:id/reopen', requireRoleMiddleware('admin'), async (req, res) => {
    try {
      if (req.user.role !== 'admin') return sendError(res, 403, 'FORBIDDEN');
      if (!UUID_REGEX.test(req.params.id)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid session ID.');
      const session = await dataStore.getSessionById(req, req.params.id);
      if (!session) return sendError(res, 404, 'NOT_FOUND');

      let closesAt = null;
      if (req.body?.closesAt) {
        const d = new Date(req.body.closesAt);
        if (Number.isNaN(d.getTime())) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid closesAt date.');
        }
        closesAt = d.toISOString();
      }

      const actorId = await dataStore.resolveActorUuid(req);
      const updated = await dataStore.updateSession(
        req,
        req.params.id,
        {
          status: 'active',
          closed_at: null,
          closed_by: null,
          closes_at: closesAt,
        },
        actorId,
        'session_reopened'
      );
      return sendOk(res, { ...updated, effectiveStatus: computeEffectiveStatus(updated) });
    } catch (err) {
      console.error('[Attendance Reopen Error]:', err);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to reopen session.');
    }
  });

  router.post('/sessions/:id/cancel', requireRoleMiddleware('admin'), async (req, res) => {
    try {
      if (req.user.role !== 'admin') return sendError(res, 403, 'FORBIDDEN');
      if (!UUID_REGEX.test(req.params.id)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid session ID.');
      const session = await dataStore.getSessionById(req, req.params.id);
      if (!session) return sendError(res, 404, 'NOT_FOUND');

      const actorId = await dataStore.resolveActorUuid(req);
      const updated = await dataStore.updateSession(
        req,
        req.params.id,
        {
          status: 'cancelled',
          closed_at: new Date().toISOString(),
          closed_by: actorId,
        },
        actorId,
        'session_cancelled'
      );
      return sendOk(res, { ...updated, effectiveStatus: computeEffectiveStatus(updated) });
    } catch (err) {
      console.error('[Attendance Cancel Error]:', err);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to cancel session.');
    }
  });

  // ===========================================================================
  // STAFF — VIEWING
  // ===========================================================================

  router.get('/sessions', requireRoleMiddleware('admin', 'coordinator'), async (req, res) => {
    try {
      const { visitId, status } = req.query;
      if (visitId && !UUID_REGEX.test(String(visitId))) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid visitId.');
      }

      let visitIds = null;
      if (req.user.role === 'coordinator') {
        visitIds = await dataStore.getCoordinatorVisitIds(req, req.user.id);
        if (visitId && !visitIds.includes(String(visitId))) {
          return sendError(res, 403, 'FORBIDDEN');
        }
      }

      const list = await dataStore.listSessions(req, {
        visitIds,
        visitId: visitId ? String(visitId) : undefined,
        status: status ? String(status) : undefined,
      });

      return sendOk(res, list);
    } catch (err) {
      console.error('[Attendance List Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message || 'Failed to load sessions.');
    }
  });

  router.get('/sessions/:id', requireRoleMiddleware('admin', 'coordinator'), async (req, res) => {
    try {
      if (!UUID_REGEX.test(req.params.id)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid session ID.');
      const session = await dataStore.getSessionById(req, req.params.id);
      if (!session) return sendError(res, 404, 'NOT_FOUND');

      if (!(await assertStaffVisitAccess(req, res, session.visit_id))) return;

      return sendOk(res, {
        ...session,
        effectiveStatus: computeEffectiveStatus(session),
      });
    } catch (err) {
      console.error('[Attendance Get Error]:', err);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load session.');
    }
  });

  router.get('/sessions/:id/qr', requireRoleMiddleware('admin', 'coordinator'), async (req, res) => {
    try {
      if (!UUID_REGEX.test(req.params.id)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid session ID.');

      if (!qrLimiter.allow(`${req.user.id}:${req.params.id}`)) {
        return sendError(res, 429, 'RATE_LIMITED');
      }

      const session = await dataStore.getSessionById(req, req.params.id);
      if (!session) return sendError(res, 404, 'NOT_FOUND');

      if (!(await assertStaffVisitAccess(req, res, session.visit_id))) return;

      const effectiveStatus = computeEffectiveStatus(session);
      const nowMs = Date.now();
      const nowSec = Math.floor(nowMs / 1000);
      const rotateSeconds = session.rotate_seconds || 30;
      const slot = computeSlot(nowSec, rotateSeconds);
      const expiresAt = new Date((slot + 1) * rotateSeconds * 1000).toISOString();

      if (effectiveStatus !== 'active') {
        return sendOk(res, {
          url: null,
          token: null,
          slot,
          expiresAt,
          rotateSeconds,
          serverTime: new Date(nowMs).toISOString(),
          sessionStatus: effectiveStatus,
        });
      }

      const secret = await dataStore.getSessionSecret(req, session.id);
      if (!secret) {
        return sendError(res, 500, 'INTERNAL_ERROR', 'Session signing secret missing.');
      }

      const issuerId = await dataStore.resolveActorUuid(req);
      const token = signAttendanceToken({
        sessionId: session.id,
        issuerId,
        slot,
        secret,
      });
      const url = buildQrUrl(process.env.APP_PUBLIC_URL, token);

      return sendOk(res, {
        url,
        token,
        slot,
        expiresAt,
        rotateSeconds,
        serverTime: new Date(nowMs).toISOString(),
        sessionStatus: effectiveStatus,
      });
    } catch (err) {
      console.error('[Attendance QR Mint Error]:', err);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to mint QR token.');
    }
  });

  router.get('/sessions/:id/roster', requireRoleMiddleware('admin', 'coordinator'), async (req, res) => {
    try {
      if (!UUID_REGEX.test(req.params.id)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid session ID.');
      const session = await dataStore.getSessionById(req, req.params.id);
      if (!session) return sendError(res, 404, 'NOT_FOUND');
      if (!(await assertStaffVisitAccess(req, res, session.visit_id))) return;

      const [participants, records] = await Promise.all([
        dataStore.getApprovedParticipants(req, session.visit_id),
        dataStore.getSessionRecords(req, session.id),
      ]);

      const recordByStudent = new Map(records.map((r) => [r.student_id, r]));
      const q = String(req.query.q || '').trim().toLowerCase();
      const group = String(req.query.group || '').trim().toLowerCase();
      const filterStatus = String(req.query.status || 'all').toLowerCase();

      const presentAll = [];
      const absentAll = [];

      for (const p of participants) {
        const rec = recordByStudent.get(p.id);
        if (rec) {
          presentAll.push({
            ...p,
            markedAt: rec.marked_at,
            method: rec.method,
            markedByName: rec.markedByName,
            viaName: rec.viaName,
            note: rec.note,
          });
        } else {
          absentAll.push(p);
        }
      }

      const matchesFilter = (row) => {
        if (q) {
          const hay = `${row.name} ${row.rollNumber} ${row.email}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (group) {
          const grp = `${row.department} ${row.batch}`.toLowerCase();
          if (!grp.includes(group)) return false;
        }
        return true;
      };

      const total = participants.length;
      const presentCount = presentAll.length;
      const absentCount = absentAll.length;
      const percent = total > 0 ? Math.round((presentCount / total) * 100) : 0;

      return sendOk(res, {
        summary: { total, present: presentCount, absent: absentCount, percent },
        present: filterStatus === 'absent' ? [] : presentAll.filter(matchesFilter),
        absent: filterStatus === 'present' ? [] : absentAll.filter(matchesFilter),
      });
    } catch (err) {
      console.error('[Attendance Roster Error]:', err);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load roster.');
    }
  });

  router.get('/sessions/:id/export.csv', requireRoleMiddleware('admin', 'coordinator'), async (req, res) => {
    try {
      if (!UUID_REGEX.test(req.params.id)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid session ID.');
      const session = await dataStore.getSessionById(req, req.params.id);
      if (!session) return sendError(res, 404, 'NOT_FOUND');
      if (!(await assertStaffVisitAccess(req, res, session.visit_id))) return;

      const [participants, records] = await Promise.all([
        dataStore.getApprovedParticipants(req, session.visit_id),
        dataStore.getSessionRecords(req, session.id),
      ]);
      const recordByStudent = new Map(records.map((r) => [r.student_id, r]));

      const header = ['Reg No', 'Name', 'Status', 'Time', 'Method', 'Marked By', 'Via', 'Note'];
      const lines = [header.map(escapeCsvCell).join(',')];

      const capped = participants.slice(0, 1000);
      for (const p of capped) {
        const rec = recordByStudent.get(p.id);
        const row = [
          p.rollNumber,
          p.name,
          rec ? 'Present' : 'Absent',
          rec ? rec.marked_at : '',
          rec ? rec.method : '',
          rec?.markedByName || '',
          rec?.viaName || '',
          rec?.note || '',
        ];
        lines.push(row.map(escapeCsvCell).join(','));
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="attendance-${session.id}.csv"`
      );
      return res.status(200).send(lines.join('\r\n'));
    } catch (err) {
      console.error('[Attendance Export Error]:', err);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to export CSV.');
    }
  });

  router.get('/sessions/:id/audit', requireRoleMiddleware('admin'), async (req, res) => {
    try {
      if (req.user.role !== 'admin') return sendError(res, 403, 'FORBIDDEN');
      if (!UUID_REGEX.test(req.params.id)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid session ID.');
      const session = await dataStore.getSessionById(req, req.params.id);
      if (!session) return sendError(res, 404, 'NOT_FOUND');

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const result = await dataStore.getSessionAudit(req, session.id, { page, limit });
      return sendOk(res, result);
    } catch (err) {
      console.error('[Attendance Audit Error]:', err);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load audit log.');
    }
  });

  // ===========================================================================
  // STAFF — MANUAL MARKING
  // ===========================================================================

  router.post('/sessions/:id/mark', requireRoleMiddleware('admin', 'coordinator'), async (req, res) => {
    try {
      if (!UUID_REGEX.test(req.params.id)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid session ID.');
      const unknown = rejectUnknownFields(req.body, ['studentIds', 'reason']);
      if (unknown.length > 0) {
        return sendError(res, 400, 'VALIDATION_ERROR', `Unknown fields: ${unknown.join(', ')}`);
      }

      const { studentIds, reason } = req.body;
      if (!Array.isArray(studentIds) || studentIds.length === 0 || studentIds.length > 100) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'studentIds must be an array of 1 to 100 UUIDs.');
      }
      if (!studentIds.every((id) => UUID_REGEX.test(String(id)))) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'All studentIds must be valid UUIDs.');
      }
      if (reason !== undefined && reason !== null && (typeof reason !== 'string' || reason.length > 300)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Reason must be 300 characters or fewer.');
      }

      const session = await dataStore.getSessionById(req, req.params.id);
      if (!session) return sendError(res, 404, 'NOT_FOUND');
      if (!(await assertStaffVisitAccess(req, res, session.visit_id))) return;

      if (computeEffectiveStatus(session) === 'cancelled') {
        return sendError(res, 409, 'SESSION_CLOSED', 'Cancelled sessions cannot be modified.');
      }

      const participants = await dataStore.getApprovedParticipants(req, session.visit_id);
      const validIds = new Set(participants.map((p) => p.id));
      const invalid = studentIds.filter((id) => !validIds.has(id));
      if (invalid.length > 0) {
        return sendError(res, 400, 'NOT_ENROLLED', 'One or more students are not approved for this visit.');
      }

      const actorId = await dataStore.resolveActorUuid(req);
      const uniqueIds = Array.from(new Set(studentIds));
      const result = await dataStore.manualMarkStudents(req, {
        sessionId: session.id,
        studentIds: uniqueIds,
        markedBy: actorId,
        reason: reason ? reason.trim() : null,
      });

      return sendOk(res, result);
    } catch (err) {
      console.error('[Attendance Manual Mark Error]:', err);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to mark students.');
    }
  });

  router.delete(
    '/sessions/:id/records/:studentId',
    requireRoleMiddleware('admin', 'coordinator'),
    async (req, res) => {
      try {
        if (!UUID_REGEX.test(req.params.id) || !UUID_REGEX.test(req.params.studentId)) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid ID.');
        }

        const rawReason = req.body?.reason ?? req.query?.reason;
        const reason = typeof rawReason === 'string' ? rawReason.trim() : '';
        if (!reason || reason.length > 300) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'A reason (1-300 chars) is required to undo attendance.');
        }

        const session = await dataStore.getSessionById(req, req.params.id);
        if (!session) return sendError(res, 404, 'NOT_FOUND');
        if (!(await assertStaffVisitAccess(req, res, session.visit_id))) return;

        if (computeEffectiveStatus(session) === 'cancelled') {
          return sendError(res, 409, 'SESSION_CLOSED', 'Cancelled sessions cannot be modified.');
        }

        const actorId = await dataStore.resolveActorUuid(req);
        const removed = await dataStore.manualUnmarkStudent(req, {
          sessionId: session.id,
          studentId: req.params.studentId,
          actorId,
          reason,
        });
        if (!removed) return sendError(res, 404, 'NOT_FOUND', 'Attendance record not found.');

        return sendOk(res, { unmarked: true });
      } catch (err) {
        console.error('[Attendance Unmark Error]:', err);
        return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to remove attendance record.');
      }
    }
  );

  // ===========================================================================
  // STUDENT — ACTIVE, SCAN, HISTORY
  // ===========================================================================

  router.get('/student/active', requireRoleMiddleware('student'), async (req, res) => {
    try {
      const sessions = await dataStore.getStudentActiveSessions(req, req.user.id);
      return sendOk(res, sessions);
    } catch (err) {
      console.error('[Attendance Student Active Error]:', err);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load active attendance sessions.');
    }
  });

  router.post('/scan', requireRoleMiddleware('student'), async (req, res) => {
    const auditRejection = async (sessionId, code) => {
      if (rejectedAuditLimiter.allow(req.user.id)) {
        await dataStore.writeAudit(req, {
          sessionId: sessionId || null,
          studentId: req.user.id,
          actorId: req.user.id,
          action: 'scan_rejected',
          reason: code,
        });
      }
    };

    try {
      if (req.user.role !== 'student') {
        return sendError(res, 403, 'FORBIDDEN', 'Only students can scan attendance QR codes.');
      }

      if (!scanStudentLimiter.allow(req.user.id) || !scanIpLimiter.allow(req.ip || 'unknown')) {
        return sendError(res, 429, 'RATE_LIMITED');
      }

      const unknown = rejectUnknownFields(req.body, ['token', 'location']);
      if (unknown.length > 0) {
        return sendError(res, 400, 'VALIDATION_ERROR', `Unknown fields: ${unknown.join(', ')}`);
      }

      const { token, location } = req.body;

      // Step 1: Parse token
      const parsed = parseAttendanceToken(token);
      if (!parsed) {
        await auditRejection(null, 'INVALID_TOKEN');
        return sendError(res, 400, 'INVALID_TOKEN');
      }

      // Step 2: Load session + secret
      const [session, secret] = await Promise.all([
        dataStore.getSessionById(req, parsed.sessionId),
        dataStore.getSessionSecret(req, parsed.sessionId),
      ]);
      if (!session || !secret) {
        await auditRejection(null, 'INVALID_TOKEN');
        return sendError(res, 400, 'INVALID_TOKEN');
      }

      // Step 3 & 4: Verify signature (constant-time) and slot window
      const tokenCheck = verifyAttendanceToken({
        parsed,
        secret,
        rotateSeconds: session.rotate_seconds || 30,
      });
      if (!tokenCheck.ok) {
        await auditRejection(session.id, tokenCheck.code);
        return sendError(res, tokenCheck.code === 'EXPIRED_TOKEN' ? 410 : 400, tokenCheck.code);
      }

      // Step 5: Issuer must still be active staff authorised for that visit
      const issuerValid = await dataStore.isActiveStaffForVisit(req, parsed.issuerId, session.visit_id);
      if (!issuerValid) {
        await auditRejection(session.id, 'INVALID_TOKEN');
        return sendError(res, 400, 'INVALID_TOKEN');
      }

      // Step 6: Session effective_status === 'active' and starts_at <= now
      const effectiveStatus = computeEffectiveStatus(session);
      if (effectiveStatus !== 'active') {
        await auditRejection(session.id, 'SESSION_CLOSED');
        return sendError(res, 409, 'SESSION_CLOSED');
      }
      if (session.starts_at && new Date(session.starts_at) > new Date()) {
        await auditRejection(session.id, 'SESSION_NOT_STARTED');
        return sendError(res, 409, 'SESSION_NOT_STARTED');
      }

      // Step 7: Student enrolled & approved in session's visit
      const enrolled = await dataStore.isStudentEnrolledApproved(req, session.visit_id, req.user.id);
      if (!enrolled) {
        await auditRejection(session.id, 'NOT_ENROLLED');
        return sendError(res, 403, 'NOT_ENROLLED');
      }

      // Step 8: Geofence check if require_location
      const geoCheck = validateScanLocation(session, location);
      if (!geoCheck.ok) {
        await auditRejection(session.id, geoCheck.code);
        return sendError(res, geoCheck.status, geoCheck.code);
      }

      // Step 9 & 10: Idempotent insert + audit
      const clientMeta = {
        ua: String(req.headers['user-agent'] || '').slice(0, 200),
        ...(location && typeof location.lat === 'number'
          ? { lat: location.lat, lng: location.lng, accuracy: location.accuracy }
          : {}),
      };

      const result = await dataStore.insertQrRecord(req, {
        sessionId: session.id,
        studentId: req.user.id,
        viaUserId: parsed.issuerId,
        clientMeta,
      });

      return sendOk(res, {
        session: {
          id: session.id,
          title: session.title,
          purpose: session.purpose,
        },
        markedAt: result.markedAt,
        alreadyMarked: result.alreadyMarked,
      });
    } catch (err) {
      console.error('[Attendance Scan Error]:', err);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to process attendance scan.');
    }
  });

  router.get('/student/history', requireRoleMiddleware('student'), async (req, res) => {
    try {
      const history = await dataStore.getStudentHistory(req, req.user.id);
      return sendOk(res, history);
    } catch (err) {
      console.error('[Attendance Student History Error]:', err);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load attendance history.');
    }
  });

  return router;
}

export default createAttendanceRouter();
