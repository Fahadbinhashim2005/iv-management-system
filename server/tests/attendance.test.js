import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {
  generateSessionSecret,
  computeSlot,
  signAttendanceToken,
  parseAttendanceToken,
  verifyAttendanceToken,
  buildQrUrl,
} from '../services/attendanceTokens.js';
import {
  computeEffectiveStatus,
  escapeCsvCell,
} from '../services/attendanceService.js';
import { createAttendanceRouter } from '../routes/attendance.js';

const VISIT_A = '11111111-1111-4111-8111-111111111111';
const VISIT_B = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const COORD_A_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const COORD_B_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const STUDENT_A_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const STUDENT_B_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

function createMockStore() {
  const visits = new Map([
    [VISIT_A, { id: VISIT_A, title: 'GIFT City IV', code: 'IV-A', lead_coordinator_id: COORD_A_ID }],
    [VISIT_B, { id: VISIT_B, title: 'ISRO IV', code: 'IV-B', lead_coordinator_id: COORD_B_ID }],
  ]);
  const sessions = new Map();
  const secrets = new Map();
  const records = [];
  const audits = [];

  const enrollments = [
    { visit_id: VISIT_A, student_id: STUDENT_A_ID, status: 'approved', name: 'Alice', rollNumber: 'CS01', email: 'alice@edu', department: 'CSE', batch: '2026' },
    { visit_id: VISIT_B, student_id: STUDENT_B_ID, status: 'approved', name: 'Bob', rollNumber: 'CS02', email: 'bob@edu', department: 'CSE', batch: '2026' },
  ];

  let seq = 1;
  const nextUuid = () => {
    const hex = String(seq++).padStart(12, '0');
    return `99999999-9999-4999-8999-${hex}`;
  };

  return {
    sessions,
    records,
    audits,
    async resolveActorUuid(req) {
      return req.user.id;
    },
    async getVisit(_req, visitId) {
      return visits.get(visitId) || null;
    },
    async isCoordinatorForVisit(_req, userId, visitId) {
      const v = visits.get(visitId);
      return v?.lead_coordinator_id === userId;
    },
    async getCoordinatorVisitIds(_req, userId) {
      return Array.from(visits.values())
        .filter((v) => v.lead_coordinator_id === userId)
        .map((v) => v.id);
    },
    async isActiveStaffForVisit(_req, userId, visitId) {
      if (userId === ADMIN_ID) return true;
      const v = visits.get(visitId);
      return v?.lead_coordinator_id === userId;
    },
    async createSession(_req, payload) {
      const id = nextUuid();
      const secret = generateSessionSecret();
      const session = {
        id,
        visit_id: payload.visitId,
        title: payload.title,
        purpose: payload.purpose,
        details: payload.details,
        status: 'active',
        starts_at: new Date(Date.now() - 1000).toISOString(),
        closes_at: payload.closesAt,
        rotate_seconds: payload.rotateSeconds,
        require_location: payload.requireLocation,
        geo_lat: payload.geo?.lat ?? null,
        geo_lng: payload.geo?.lng ?? null,
        geo_radius_m: payload.geo?.radiusM ?? null,
        created_by: payload.createdBy,
        created_at: new Date().toISOString(),
      };
      sessions.set(id, session);
      secrets.set(id, secret);
      audits.push({ session_id: id, actor_id: payload.createdBy, action: 'session_created' });
      return session;
    },
    async getSessionById(_req, id) {
      return sessions.get(id) || null;
    },
    async getSessionSecret(_req, id) {
      return secrets.get(id) || null;
    },
    async updateSession(_req, id, updates, actorId, action) {
      const s = sessions.get(id);
      const updated = { ...s, ...updates };
      sessions.set(id, updated);
      audits.push({ session_id: id, actor_id: actorId, action });
      return updated;
    },
    async listSessions(_req, { visitIds, visitId, status }) {
      return Array.from(sessions.values())
        .filter((s) => (!visitId || s.visit_id === visitId))
        .filter((s) => (!visitIds || visitIds.includes(s.visit_id)))
        .filter((s) => (status ? s.status === status : s.status !== 'cancelled'))
        .map((s) => ({
          ...s,
          effectiveStatus: computeEffectiveStatus(s),
          counts: { total: 1, present: records.filter((r) => r.session_id === s.id).length },
        }));
    },
    async getApprovedParticipants(_req, visitId) {
      return enrollments
        .filter((e) => e.visit_id === visitId && e.status === 'approved')
        .map((e) => ({
          id: e.student_id,
          name: e.name,
          email: e.email,
          rollNumber: e.rollNumber,
          department: e.department,
          batch: e.batch,
        }));
    },
    async getSessionRecords(_req, sessionId) {
      return records.filter((r) => r.session_id === sessionId);
    },
    async isStudentEnrolledApproved(_req, visitId, studentId) {
      return enrollments.some((e) => e.visit_id === visitId && e.student_id === studentId && e.status === 'approved');
    },
    async insertQrRecord(_req, { sessionId, studentId, viaUserId }) {
      const existing = records.find((r) => r.session_id === sessionId && r.student_id === studentId);
      if (existing) return { alreadyMarked: true, markedAt: existing.marked_at };
      const markedAt = new Date().toISOString();
      records.push({ session_id: sessionId, student_id: studentId, method: 'qr', marked_at: markedAt, via_user_id: viaUserId, viaName: 'Coordinator' });
      audits.push({ session_id: sessionId, student_id: studentId, actor_id: studentId, action: 'qr_mark' });
      return { alreadyMarked: false, markedAt };
    },
    async manualMarkStudents(_req, { sessionId, studentIds, markedBy, reason }) {
      let marked = 0;
      let skipped = 0;
      for (const sid of studentIds) {
        if (records.some((r) => r.session_id === sessionId && r.student_id === sid)) {
          skipped++;
        } else {
          records.push({ session_id: sessionId, student_id: sid, method: 'manual', marked_at: new Date().toISOString(), marked_by: markedBy, markedByName: 'Staff', note: reason });
          audits.push({ session_id: sessionId, student_id: sid, actor_id: markedBy, action: 'manual_mark', reason });
          marked++;
        }
      }
      return { marked, skipped };
    },
    async manualUnmarkStudent(_req, { sessionId, studentId, actorId, reason }) {
      const idx = records.findIndex((r) => r.session_id === sessionId && r.student_id === studentId);
      if (idx === -1) return false;
      records.splice(idx, 1);
      audits.push({ session_id: sessionId, student_id: studentId, actor_id: actorId, action: 'manual_unmark', reason });
      return true;
    },
    async getStudentActiveSessions(_req, studentId) {
      const vIds = enrollments.filter((e) => e.student_id === studentId).map((e) => e.visit_id);
      return Array.from(sessions.values())
        .filter((s) => vIds.includes(s.visit_id) && computeEffectiveStatus(s) === 'active')
        .map((s) => ({ ...s, alreadyMarked: records.some((r) => r.session_id === s.id && r.student_id === studentId) }));
    },
    async getStudentHistory(_req, studentId) {
      const vIds = enrollments.filter((e) => e.student_id === studentId).map((e) => e.visit_id);
      return Array.from(sessions.values())
        .filter((s) => vIds.includes(s.visit_id) && s.status !== 'cancelled')
        .map((s) => {
          const rec = records.find((r) => r.session_id === s.id && r.student_id === studentId);
          return { sessionId: s.id, sessionTitle: s.title, purpose: s.purpose, status: rec ? 'present' : 'absent', markedAt: rec?.marked_at || null };
        });
    },
    async getSessionAudit(_req, sessionId) {
      const items = audits.filter((a) => a.session_id === sessionId);
      return { items, total: items.length, page: 1, limit: 50 };
    },
    async writeAudit(_req, entry) {
      audits.push(entry);
    },
  };
}

function createTestServer(store) {
  const app = express();
  app.use(express.json());

  const mockAuth = (req, res, next) => {
    const role = req.headers['x-test-role'];
    const id = req.headers['x-test-user-id'];
    if (!role || !id) return res.status(401).json({ error: 'Unauthorized' });
    req.user = { id, role, name: `Test ${role}` };
    next();
  };

  const mockRole = (...roles) => (req, res, next) => {
    if (req.user.role === 'admin' || roles.includes(req.user.role)) return next();
    return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } });
  };

  app.use(
    '/api/attendance',
    createAttendanceRouter({
      store,
      requireAuthMiddleware: mockAuth,
      requireRoleMiddleware: mockRole,
    })
  );

  return app;
}

async function reqJson(baseUrl, path, { method = 'GET', role, userId, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(role ? { 'x-test-role': role } : {}),
      ...(userId ? { 'x-test-user-id': userId } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json, headers: res.headers };
}

describe('Attendance Token Service', () => {
  it('signs and verifies a valid token in current and previous slot', () => {
    const secret = generateSessionSecret();
    const rotateSeconds = 30;
    const nowSec = 1700000100;
    const slot = computeSlot(nowSec, rotateSeconds);
    const token = signAttendanceToken({ sessionId: VISIT_A, issuerId: COORD_A_ID, slot, secret });

    const parsed = parseAttendanceToken(token);
    assert.ok(parsed);
    assert.equal(parsed.sessionId, VISIT_A);
    assert.equal(parsed.issuerId, COORD_A_ID);
    assert.equal(parsed.slot, slot);

    assert.equal(verifyAttendanceToken({ parsed, secret, rotateSeconds, nowSeconds: nowSec }).ok, true);
    assert.equal(verifyAttendanceToken({ parsed, secret, rotateSeconds, nowSeconds: nowSec + 30 }).ok, true);
    assert.equal(verifyAttendanceToken({ parsed, secret, rotateSeconds, nowSeconds: nowSec + 65 }).code, 'EXPIRED_TOKEN');
    assert.equal(verifyAttendanceToken({ parsed, secret, rotateSeconds, nowSeconds: nowSec - 30 }).code, 'EXPIRED_TOKEN');
  });

  it('extracts token from full QR URL and rejects tampered tokens', () => {
    const secret = generateSessionSecret();
    const slot = computeSlot(1700000100, 30);
    const token = signAttendanceToken({ sessionId: VISIT_A, issuerId: COORD_A_ID, slot, secret });
    const url = buildQrUrl('https://iv-management-system.vercel.app', token);

    const parsedUrl = parseAttendanceToken(url);
    assert.ok(parsedUrl);
    assert.equal(parsedUrl.token, token);

    const tampered = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');
    const parsedTampered = parseAttendanceToken(tampered);
    assert.ok(parsedTampered);
    const check = verifyAttendanceToken({ parsed: parsedTampered, secret, rotateSeconds: 30, nowSeconds: 1700000100 });
    assert.equal(check.ok, false);
    assert.equal(check.code, 'INVALID_TOKEN');
  });
});

describe('CSV Injection Escaping', () => {
  it('prefixes formula characters with single quote', () => {
    assert.equal(escapeCsvCell('=CMD()'), "'=CMD()");
    assert.equal(escapeCsvCell('+1+1'), "'+1+1");
    assert.equal(escapeCsvCell('-1'), "'-1");
    assert.equal(escapeCsvCell('@SUM(A1)'), "'@SUM(A1)");
    assert.equal(escapeCsvCell('Normal, Name'), '"Normal, Name"');
  });
});

describe('Attendance API Authorization & Scan Lifecycle', () => {
  let store;
  let server;
  let baseUrl;

  beforeEach(async () => {
    store = createMockStore();
    const app = createTestServer(store);
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}/api/attendance`;
        resolve();
      });
    });
  });

  it('enforces role and visit-scope authorization across endpoints', async (t) => {
    t.after(() => server.close());

    // Student cannot create session
    const stuCreate = await reqJson(baseUrl, '/sessions', {
      method: 'POST',
      role: 'student',
      userId: STUDENT_A_ID,
      body: { visitId: VISIT_A, title: 'Bus 1', purpose: 'boarding' },
    });
    assert.equal(stuCreate.status, 403);

    // Coordinator cannot create session
    const coordCreate = await reqJson(baseUrl, '/sessions', {
      method: 'POST',
      role: 'coordinator',
      userId: COORD_A_ID,
      body: { visitId: VISIT_A, title: 'Bus 1', purpose: 'boarding' },
    });
    assert.equal(coordCreate.status, 403);

    // Admin creates session for VISIT_A
    const admCreate = await reqJson(baseUrl, '/sessions', {
      method: 'POST',
      role: 'admin',
      userId: ADMIN_ID,
      body: { visitId: VISIT_A, title: 'Bus Boarding Day 1', purpose: 'boarding' },
    });
    assert.equal(admCreate.status, 201);
    const sessionId = admCreate.body.data.id;

    // Coordinator B (unassigned to VISIT_A) gets 403 FORBIDDEN on QR & roster
    const coordBQr = await reqJson(baseUrl, `/sessions/${sessionId}/qr`, {
      role: 'coordinator',
      userId: COORD_B_ID,
    });
    assert.equal(coordBQr.status, 403);

    // Coordinator A (assigned to VISIT_A) gets valid QR
    const coordAQr = await reqJson(baseUrl, `/sessions/${sessionId}/qr`, {
      role: 'coordinator',
      userId: COORD_A_ID,
    });
    assert.equal(coordAQr.status, 200);
    const qrToken = coordAQr.body.data.token;
    assert.ok(qrToken.startsWith('v1.'));

    // Student B (enrolled in VISIT_B, NOT VISIT_A) gets NOT_ENROLLED
    const stuBScan = await reqJson(baseUrl, '/scan', {
      method: 'POST',
      role: 'student',
      userId: STUDENT_B_ID,
      body: { token: qrToken },
    });
    assert.equal(stuBScan.status, 403);
    assert.equal(stuBScan.body.error.code, 'NOT_ENROLLED');

    // Student A scans -> Present
    const stuAScan1 = await reqJson(baseUrl, '/scan', {
      method: 'POST',
      role: 'student',
      userId: STUDENT_A_ID,
      body: { token: qrToken },
    });
    assert.equal(stuAScan1.status, 200);
    assert.equal(stuAScan1.body.data.alreadyMarked, false);

    // Student A double scans -> idempotent alreadyMarked: true
    const stuAScan2 = await reqJson(baseUrl, '/scan', {
      method: 'POST',
      role: 'student',
      userId: STUDENT_A_ID,
      body: { token: qrToken },
    });
    assert.equal(stuAScan2.status, 200);
    assert.equal(stuAScan2.body.data.alreadyMarked, true);

    // Close session -> scan returns SESSION_CLOSED
    const closeRes = await reqJson(baseUrl, `/sessions/${sessionId}/close`, {
      method: 'POST',
      role: 'admin',
      userId: ADMIN_ID,
    });
    assert.equal(closeRes.status, 200);

    const closedScan = await reqJson(baseUrl, '/scan', {
      method: 'POST',
      role: 'student',
      userId: STUDENT_A_ID,
      body: { token: qrToken },
    });
    assert.equal(closedScan.status, 409);
    assert.equal(closedScan.body.error.code, 'SESSION_CLOSED');

    // Coordinator A exports CSV
    const csvRes = await reqJson(baseUrl, `/sessions/${sessionId}/export.csv`, {
      role: 'coordinator',
      userId: COORD_A_ID,
    });
    assert.equal(csvRes.status, 200);
    assert.match(csvRes.body, /Alice/);
    assert.match(csvRes.body, /Present/);
  });
});
