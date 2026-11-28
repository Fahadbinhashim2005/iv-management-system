import { generateSessionSecret } from './attendanceTokens.js';

export const ATTENDANCE_PURPOSES = [
  'departure',
  'boarding',
  'hotel_checkin',
  'company_entry',
  'headcount',
  'custom',
];

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ERROR_MESSAGES = {
  INVALID_TOKEN: "This isn't a valid attendance QR.",
  EXPIRED_TOKEN: 'This QR has expired. Scan the live QR on the screen again.',
  SESSION_CLOSED: 'This attendance session is closed.',
  SESSION_NOT_STARTED: "This attendance hasn't started yet.",
  NOT_ENROLLED: "You're not registered for this visit. Contact your coordinator.",
  LOCATION_REQUIRED: 'Location is required. Please allow location access and try again.',
  OUT_OF_RANGE: 'You seem to be away from the venue.',
  RATE_LIMITED: 'Too many attempts. Wait a moment and try again.',
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: 'Not found.',
};

export function sendOk(res, data, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function sendError(res, status, code, customMessage) {
  return res.status(status).json({
    ok: false,
    error: {
      code,
      message: customMessage || ERROR_MESSAGES[code] || 'Request failed.',
    },
  });
}

/**
 * Single server helper for computing effective session status.
 * If status === 'active' and closes_at <= now, effective status is 'closed'.
 */
export function computeEffectiveStatus(session, now = new Date()) {
  if (!session) return 'closed';
  if (session.status === 'active' && session.closes_at) {
    const closesAt = new Date(session.closes_at);
    if (!Number.isNaN(closesAt.getTime()) && closesAt <= now) {
      return 'closed';
    }
  }
  return session.status;
}

/**
 * Haversine distance in meters between two lat/lng coordinates.
 */
export function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Validate geolocation for sessions with require_location = true.
 */
export function validateScanLocation(session, location) {
  if (!session.require_location) return { ok: true };
  if (
    !location ||
    typeof location.lat !== 'number' ||
    typeof location.lng !== 'number' ||
    !Number.isFinite(location.lat) ||
    !Number.isFinite(location.lng) ||
    location.lat < -90 ||
    location.lat > 90 ||
    location.lng < -180 ||
    location.lng > 180
  ) {
    return { ok: false, status: 422, code: 'LOCATION_REQUIRED' };
  }

  if (
    typeof session.geo_lat === 'number' &&
    typeof session.geo_lng === 'number'
  ) {
    const radius = Number(session.geo_radius_m) || 150;
    const dist = haversineDistanceMeters(
      session.geo_lat,
      session.geo_lng,
      location.lat,
      location.lng
    );
    if (dist > radius) {
      return { ok: false, status: 403, code: 'OUT_OF_RANGE', distanceM: Math.round(dist) };
    }
  }

  return { ok: true };
}

/**
 * Escape a single CSV cell against formula injection (=, +, -, @, tab, CR)
 * and standard RFC 4180 quoting.
 */
export function escapeCsvCell(raw) {
  let str = raw === null || raw === undefined ? '' : String(raw);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Simple in-memory TTL cache for session secrets (<= 60s) to keep /scan O(1) DB work
 * during 100-student bursts.
 */
export class SecretCache {
  constructor(ttlMs = 60_000) {
    this.ttlMs = ttlMs;
    this.map = new Map();
  }

  get(sessionId) {
    const entry = this.map.get(sessionId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(sessionId);
      return null;
    }
    return entry.secret;
  }

  set(sessionId, secret) {
    this.map.set(sessionId, { secret, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(sessionId) {
    this.map.delete(sessionId);
  }
}

/**
 * In-memory sliding-window rate limiter.
 * Note: Acceptable for a single Railway instance; replace with Redis if horizontally scaled.
 */
export class SlidingWindowLimiter {
  constructor({ windowMs, max }) {
    this.windowMs = windowMs;
    this.max = max;
    this.buckets = new Map();
  }

  allow(key) {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const timestamps = (this.buckets.get(key) || []).filter((t) => t > cutoff);
    if (timestamps.length >= this.max) {
      this.buckets.set(key, timestamps);
      return false;
    }
    timestamps.push(now);
    this.buckets.set(key, timestamps);
    if (this.buckets.size > 5000) {
      for (const [k, list] of this.buckets.entries()) {
        if (list.length === 0 || list[list.length - 1] <= cutoff) {
          this.buckets.delete(k);
        }
      }
    }
    return true;
  }
}

/**
 * Create a Supabase-backed store for attendance operations.
 */
export function createSupabaseAttendanceStore(getClient) {
  const secretCache = new SecretCache(60_000);

  return {
    async resolveActorUuid(req) {
      if (UUID_REGEX.test(String(req.user?.id || ''))) {
        return req.user.id;
      }
      const sb = getClient(req);
      if (req.user?.email) {
        const { data: byEmail } = await sb
          .from('profiles')
          .select('id')
          .eq('email', req.user.email.toLowerCase())
          .maybeSingle();
        if (byEmail?.id) return byEmail.id;
      }
      if (req.user?.role === 'admin') {
        const { data: anyAdmin } = await sb
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle();
        if (anyAdmin?.id) return anyAdmin.id;
      }
      throw new Error('Could not resolve a valid profile UUID for the current user.');
    },

    async listVisits(req) {
      const sb = getClient(req);
      const { data, error } = await sb
        .from('industrial_visits')
        .select('id, title, code, status, start_date, end_date')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async getVisit(req, visitId) {
      const sb = getClient(req);
      const { data, error } = await sb
        .from('industrial_visits')
        .select('id, title, code, lead_coordinator_id, status')
        .eq('id', visitId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async isCoordinatorForVisit(req, userId, visitId) {
      const sb = getClient(req);
      const { data: visit } = await sb
        .from('industrial_visits')
        .select('id, lead_coordinator_id')
        .eq('id', visitId)
        .maybeSingle();
      if (visit?.lead_coordinator_id === userId) return true;

      const { data: assignment } = await sb
        .from('visit_coordinators')
        .select('id')
        .eq('visit_id', visitId)
        .eq('faculty_id', userId)
        .maybeSingle();
      return Boolean(assignment);
    },

    async getCoordinatorVisitIds(req, userId) {
      const sb = getClient(req);
      const [{ data: leadVisits }, { data: delegated }] = await Promise.all([
        sb.from('industrial_visits').select('id').eq('lead_coordinator_id', userId),
        sb.from('visit_coordinators').select('visit_id').eq('faculty_id', userId),
      ]);
      const set = new Set();
      (leadVisits || []).forEach((v) => set.add(v.id));
      (delegated || []).forEach((v) => set.add(v.visit_id));
      return Array.from(set);
    },

    async isActiveStaffForVisit(req, userId, visitId) {
      const sb = getClient(req);
      const { data: profile } = await sb
        .from('profiles')
        .select('id, role, is_active')
        .eq('id', userId)
        .maybeSingle();
      if (!profile || profile.is_active === false) return false;
      const role = String(profile.role || '').toLowerCase();
      if (role === 'admin') return true;
      if (role === 'coordinator') {
        return await this.isCoordinatorForVisit(req, userId, visitId);
      }
      return false;
    },

    async createSession(req, payload) {
      const sb = getClient(req);
      const secret = generateSessionSecret();
      const { data: session, error } = await sb
        .from('attendance_sessions')
        .insert({
          visit_id: payload.visitId,
          title: payload.title,
          purpose: payload.purpose,
          details: payload.details ?? null,
          status: 'active',
          closes_at: payload.closesAt ?? null,
          rotate_seconds: payload.rotateSeconds,
          require_location: payload.requireLocation,
          geo_lat: payload.geo?.lat ?? null,
          geo_lng: payload.geo?.lng ?? null,
          geo_radius_m: payload.geo?.radiusM ?? null,
          created_by: payload.createdBy,
        })
        .select('*')
        .single();
      if (error) throw error;

      const { error: secErr } = await sb
        .from('attendance_session_secrets')
        .insert({ session_id: session.id, secret });
      if (secErr) {
        await sb.from('attendance_sessions').delete().eq('id', session.id);
        throw secErr;
      }

      secretCache.set(session.id, secret);
      await this.writeAudit(req, {
        sessionId: session.id,
        actorId: payload.createdBy,
        action: 'session_created',
        meta: { title: session.title, purpose: session.purpose },
      });

      return session;
    },

    async getSessionById(req, sessionId) {
      const sb = getClient(req);
      const { data, error } = await sb
        .from('attendance_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async getSessionSecret(req, sessionId) {
      const cached = secretCache.get(sessionId);
      if (cached) return cached;
      const sb = getClient(req);
      const { data, error } = await sb
        .from('attendance_session_secrets')
        .select('secret')
        .eq('session_id', sessionId)
        .maybeSingle();
      if (error) throw error;
      if (data?.secret) {
        secretCache.set(sessionId, data.secret);
        return data.secret;
      }
      return null;
    },

    async updateSession(req, sessionId, updates, actorId, auditAction = 'session_updated') {
      const sb = getClient(req);
      const { data, error } = await sb
        .from('attendance_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select('*')
        .single();
      if (error) throw error;

      await this.writeAudit(req, {
        sessionId,
        actorId,
        action: auditAction,
        meta: updates,
      });
      return data;
    },

    async listSessions(req, { visitIds, visitId, status }) {
      const sb = getClient(req);
      let query = sb
        .from('attendance_sessions')
        .select('*, industrial_visits(id, title, code)')
        .order('created_at', { ascending: false });

      if (visitId) {
        query = query.eq('visit_id', visitId);
      } else if (Array.isArray(visitIds)) {
        if (visitIds.length === 0) return [];
        query = query.in('visit_id', visitIds);
      }

      if (status) {
        query = query.eq('status', status);
      } else {
        query = query.neq('status', 'cancelled');
      }

      const { data: sessions, error } = await query;
      if (error) throw error;
      if (!sessions?.length) return [];

      const sessionIds = sessions.map((s) => s.id);
      const distinctVisitIds = Array.from(new Set(sessions.map((s) => s.visit_id)));

      const [{ data: recRows }, { data: enrollRows }, { data: approvedProfiles }] = await Promise.all([
        sb.from('attendance_records').select('session_id').in('session_id', sessionIds),
        sb
          .from('visit_enrollments')
          .select('visit_id, student_id')
          .in('visit_id', distinctVisitIds)
          .eq('status', 'approved'),
        sb
          .from('profiles')
          .select('id')
          .eq('role', 'student')
          .eq('approval_status', 'approved')
          .neq('is_active', false),
      ]);

      const presentBySession = {};
      (recRows || []).forEach((r) => {
        presentBySession[r.session_id] = (presentBySession[r.session_id] || 0) + 1;
      });

      const approvedIds = new Set((approvedProfiles || []).map((p) => p.id));
      const idsByVisit = {};
      (enrollRows || []).forEach((e) => {
        if (!idsByVisit[e.visit_id]) idsByVisit[e.visit_id] = new Set(approvedIds);
        idsByVisit[e.visit_id].add(e.student_id);
      });

      return sessions.map((s) => ({
        ...s,
        effectiveStatus: computeEffectiveStatus(s),
        counts: {
          total: idsByVisit[s.visit_id]?.size ?? approvedIds.size,
          present: presentBySession[s.id] || 0,
        },
      }));
    },

    async getApprovedParticipants(req, visitId) {
      const sb = getClient(req);
      const [{ data: enrollData, error: enrollErr }, { data: profileData, error: profErr }] =
        await Promise.all([
          sb
            .from('visit_enrollments')
            .select(
              'student_id, profiles:student_id(id, full_name, email, roll_no, department, batch, phone)'
            )
            .eq('visit_id', visitId)
            .eq('status', 'approved'),
          sb
            .from('profiles')
            .select('id, full_name, email, roll_no, department, batch, phone')
            .eq('role', 'student')
            .eq('approval_status', 'approved')
            .neq('is_active', false)
            .order('full_name', { ascending: true }),
        ]);

      if (enrollErr && profErr) throw enrollErr;

      const byId = new Map();
      const mapRow = (p) => ({
        id: p.id,
        name: p.full_name || p.email?.split('@')[0] || 'Student',
        email: p.email || '',
        rollNumber: p.roll_no || p.roll_number || '',
        department: p.department || '',
        batch: p.batch || p.academic_batch || '',
        phone: p.phone || p.phone_number || '',
      });

      for (const p of profileData || []) {
        if (p?.id) byId.set(p.id, mapRow(p));
      }
      for (const row of enrollData || []) {
        if (row?.profiles?.id && !byId.has(row.profiles.id)) {
          byId.set(row.profiles.id, mapRow(row.profiles));
        }
      }

      return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
    },

    async getSessionRecords(req, sessionId) {
      const sb = getClient(req);
      const { data, error } = await sb
        .from('attendance_records')
        .select(
          'id, session_id, student_id, method, marked_at, marked_by, via_user_id, note'
        )
        .eq('session_id', sessionId)
        .order('marked_at', { ascending: false });
      if (error) throw error;

      const staffIds = Array.from(
        new Set(
          (data || []).flatMap((r) => [r.marked_by, r.via_user_id].filter(Boolean))
        )
      );
      const studentIds = Array.from(
        new Set((data || []).map((r) => r.student_id).filter(Boolean))
      );
      const lookupIds = Array.from(new Set([...staffIds, ...studentIds]));
      const profileMap = {};
      if (lookupIds.length > 0) {
        const { data: profRows } = await sb
          .from('profiles')
          .select('id, full_name, email, roll_no, department, batch, phone')
          .in('id', lookupIds);
        (profRows || []).forEach((p) => {
          profileMap[p.id] = p;
        });
      }

      return (data || []).map((r) => {
        const st = profileMap[r.student_id];
        return {
          ...r,
          studentName: st?.full_name || st?.email?.split('@')[0] || 'Student',
          studentEmail: st?.email || '',
          studentRollNumber: st?.roll_no || '',
          studentDepartment: st?.department || '',
          studentBatch: st?.batch || '',
          studentPhone: st?.phone || '',
          markedByName: r.marked_by ? profileMap[r.marked_by]?.full_name || 'Staff' : null,
          viaName: r.via_user_id ? profileMap[r.via_user_id]?.full_name || 'Staff' : null,
        };
      });
    },

    async isStudentEnrolledApproved(req, visitId, studentId) {
      const sb = getClient(req);
      const [{ data: enroll, error: eErr }, { data: prof, error: pErr }] = await Promise.all([
        sb
          .from('visit_enrollments')
          .select('id')
          .eq('visit_id', visitId)
          .eq('student_id', studentId)
          .eq('status', 'approved')
          .maybeSingle(),
        sb
          .from('profiles')
          .select('id, approval_status, is_active')
          .eq('id', studentId)
          .maybeSingle(),
      ]);
      if (eErr && pErr) throw eErr;
      if (enroll) return true;
      return Boolean(prof && prof.approval_status === 'approved' && prof.is_active !== false);
    },

    async insertQrRecord(req, { sessionId, studentId, viaUserId, clientMeta }) {
      const sb = getClient(req);
      const { data: existing } = await sb
        .from('attendance_records')
        .select('id, marked_at')
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .maybeSingle();
      if (existing) {
        return { alreadyMarked: true, markedAt: existing.marked_at };
      }

      const { data: inserted, error } = await sb
        .from('attendance_records')
        .upsert(
          {
            session_id: sessionId,
            student_id: studentId,
            method: 'qr',
            via_user_id: viaUserId,
            client_meta: clientMeta || null,
          },
          { onConflict: 'session_id,student_id', ignoreDuplicates: true }
        )
        .select('id, marked_at')
        .maybeSingle();

      if (error) throw error;

      if (!inserted) {
        const { data: after } = await sb
          .from('attendance_records')
          .select('marked_at')
          .eq('session_id', sessionId)
          .eq('student_id', studentId)
          .maybeSingle();
        return { alreadyMarked: true, markedAt: after?.marked_at || new Date().toISOString() };
      }

      await this.writeAudit(req, {
        sessionId,
        studentId,
        actorId: studentId,
        action: 'qr_mark',
        meta: { viaUserId },
      });

      return { alreadyMarked: false, markedAt: inserted.marked_at };
    },

    async manualMarkStudents(req, { sessionId, studentIds, markedBy, reason }) {
      const sb = getClient(req);
      const { data: existing } = await sb
        .from('attendance_records')
        .select('student_id')
        .eq('session_id', sessionId)
        .in('student_id', studentIds);
      const existingSet = new Set((existing || []).map((r) => r.student_id));

      const toInsert = studentIds.filter((id) => !existingSet.has(id));
      const skipped = studentIds.length - toInsert.length;

      if (toInsert.length > 0) {
        const rows = toInsert.map((studentId) => ({
          session_id: sessionId,
          student_id: studentId,
          method: 'manual',
          marked_by: markedBy,
          note: reason || null,
        }));
        const { error } = await sb
          .from('attendance_records')
          .upsert(rows, { onConflict: 'session_id,student_id', ignoreDuplicates: true });
        if (error) throw error;

        await Promise.all(
          toInsert.map((studentId) =>
            this.writeAudit(req, {
              sessionId,
              studentId,
              actorId: markedBy,
              action: 'manual_mark',
              reason: reason || null,
            })
          )
        );
      }

      return { marked: toInsert.length, skipped };
    },

    async manualUnmarkStudent(req, { sessionId, studentId, actorId, reason }) {
      const sb = getClient(req);
      const { data: deleted, error } = await sb
        .from('attendance_records')
        .delete()
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!deleted) return false;

      await this.writeAudit(req, {
        sessionId,
        studentId,
        actorId,
        action: 'manual_unmark',
        reason,
      });
      return true;
    },

    async getStudentActiveSessions(req, studentId) {
      const sb = getClient(req);
      const [{ data: enrollments, error: eErr }, { data: prof }] = await Promise.all([
        sb
          .from('visit_enrollments')
          .select('visit_id')
          .eq('student_id', studentId)
          .eq('status', 'approved'),
        sb
          .from('profiles')
          .select('id, approval_status, is_active')
          .eq('id', studentId)
          .maybeSingle(),
      ]);
      if (eErr) throw eErr;
      const isApprovedProfile = Boolean(
        prof && prof.approval_status === 'approved' && prof.is_active !== false
      );
      const visitIds = (enrollments || []).map((e) => e.visit_id);
      if (visitIds.length === 0 && !isApprovedProfile) return [];

      let sessQuery = sb
        .from('attendance_sessions')
        .select('id, visit_id, title, purpose, details, status, starts_at, closes_at, require_location, created_at, industrial_visits(title, code)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (!isApprovedProfile) {
        sessQuery = sessQuery.in('visit_id', visitIds);
      }
      const { data: sessions, error: sErr } = await sessQuery;
      if (sErr) throw sErr;

      const active = (sessions || []).filter((s) => computeEffectiveStatus(s) === 'active');
      if (active.length === 0) return [];

      const { data: records } = await sb
        .from('attendance_records')
        .select('session_id, marked_at, method')
        .eq('student_id', studentId)
        .in('session_id', active.map((s) => s.id));
      const recMap = new Map((records || []).map((r) => [r.session_id, r]));

      return active.map((s) => {
        const rec = recMap.get(s.id);
        return {
          ...s,
          alreadyMarked: Boolean(rec),
          markedAt: rec?.marked_at || null,
          method: rec?.method || null,
        };
      });
    },

    async getStudentHistory(req, studentId) {
      const sb = getClient(req);
      const [{ data: enrollments, error: eErr }, { data: prof }] = await Promise.all([
        sb
          .from('visit_enrollments')
          .select('visit_id')
          .eq('student_id', studentId)
          .eq('status', 'approved'),
        sb
          .from('profiles')
          .select('id, approval_status, is_active')
          .eq('id', studentId)
          .maybeSingle(),
      ]);
      if (eErr) throw eErr;
      const isApprovedProfile = Boolean(
        prof && prof.approval_status === 'approved' && prof.is_active !== false
      );
      const visitIds = (enrollments || []).map((e) => e.visit_id);
      if (visitIds.length === 0 && !isApprovedProfile) return [];

      let histQuery = sb
        .from('attendance_sessions')
        .select('id, visit_id, title, purpose, status, starts_at, closes_at, created_at')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
      if (!isApprovedProfile) {
        histQuery = histQuery.in('visit_id', visitIds);
      }
      const { data: sessions, error: sErr } = await histQuery;
      if (sErr) throw sErr;
      if (!sessions?.length) return [];

      const { data: records } = await sb
        .from('attendance_records')
        .select('session_id, marked_at, method')
        .eq('student_id', studentId)
        .in('session_id', sessions.map((s) => s.id));
      const recMap = new Map((records || []).map((r) => [r.session_id, r]));

      return sessions
        .filter((s) => recMap.has(s.id) || computeEffectiveStatus(s) === 'closed')
        .map((s) => {
          const rec = recMap.get(s.id);
          return {
            sessionId: s.id,
            sessionTitle: s.title,
            purpose: s.purpose,
            status: rec ? 'present' : 'absent',
            markedAt: rec?.marked_at || null,
            method: rec?.method || null,
            createdAt: s.created_at,
          };
        });
    },

    async getSessionAudit(req, sessionId, { page = 1, limit = 50 }) {
      const sb = getClient(req);
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, error, count } = await sb
        .from('attendance_audit_log')
        .select('*', { count: 'exact' })
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { items: data || [], total: count || 0, page, limit };
    },

    async writeAudit(req, { sessionId, studentId = null, actorId = null, action, reason = null, meta = null }) {
      try {
        const sb = getClient(req);
        if (!sb) return;
        await sb.from('attendance_audit_log').insert({
          session_id: sessionId || null,
          student_id: studentId,
          actor_id: actorId,
          action,
          reason,
          meta,
        });
      } catch (err) {
        console.warn('[Attendance Audit Note]:', err.message);
      }
    },
  };
}
