import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRoomsRouter } from '../routes/rooms.js';
import { createMemoryRoomStore } from '../services/roomAllocationStore.js';

function makeUuid(prefix, n) {
  return `${prefix}-${String(n).padStart(12, '0')}`;
}

const ADMIN_ID = makeUuid('aaaaaaaa-aaaa-4aaa-8aaa', 1);

function buildTestProfiles() {
  const list = [
    {
      id: ADMIN_ID,
      email: 'admin@college.edu',
      full_name: 'Chief Admin',
      role: 'admin',
      gender: 'male',
      approval_status: 'approved',
      is_active: true,
    },
  ];
  // 30 male students
  for (let i = 1; i <= 30; i++) {
    list.push({
      id: makeUuid('bbbbbbbb-bbbb-4bbb-8bbb', i),
      email: `boy${i}@college.edu`,
      full_name: `Boy Student ${i}`,
      role: 'student',
      gender: 'male',
      roll_no: `CS-M-${i}`,
      approval_status: 'approved',
      is_active: true,
    });
  }
  // 25 female students
  for (let i = 1; i <= 25; i++) {
    list.push({
      id: makeUuid('cccccccc-cccc-4ccc-8ccc', i),
      email: `girl${i}@college.edu`,
      full_name: `Girl Student ${i}`,
      role: 'student',
      gender: 'female',
      roll_no: `CS-F-${i}`,
      approval_status: 'approved',
      is_active: true,
    });
  }
  // 5 coordinators (3 male, 2 female)
  for (let i = 1; i <= 5; i++) {
    list.push({
      id: makeUuid('dddddddd-dddd-4ddd-8ddd', i),
      email: `coord${i}@college.edu`,
      full_name: `Coordinator ${i}`,
      role: 'coordinator',
      gender: i <= 2 ? 'female' : 'male',
      approval_status: 'approved',
      is_active: true,
    });
  }
  // 1 student with missing gender
  list.push({
    id: makeUuid('eeeeeeee-eeee-4eee-8eee', 1),
    email: 'nogender@college.edu',
    full_name: 'No Gender Student',
    role: 'student',
    gender: null,
    approval_status: 'approved',
    is_active: true,
  });
  return list;
}

function createTestServer(store) {
  const app = express();
  app.use(express.json());
  const router = createRoomsRouter({
    store,
    requireAuthMiddleware: (req, res, next) => {
      const uid = req.headers['x-test-user-id'];
      const p = store.profileMap.get(uid);
      if (!p) return res.status(401).json({ error: 'Missing test user' });
      req.user = {
        id: p.id,
        email: p.email,
        name: p.full_name,
        role: p.role,
        approval_status: p.approval_status,
        is_active: p.is_active,
      };
      next();
    },
  });
  app.use('/api', router);
  return app;
}

async function withServer(app, fn) {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const call = async (method, path, userId, body = null, extraHeaders = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': userId,
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, json, headers: res.headers };
  };

  try {
    await fn(call);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe('Room Allocation Module — Concurrency, Security & Acceptance Suite', () => {
  let store;
  let app;

  beforeEach(() => {
    store = createMemoryRoomStore({ profiles: buildTestProfiles() });
    app = createTestServer(store);
  });

  it('1. Race test: 60 parallel selects on capacity-4 room -> exactly 4 succeed, 56 get ROOM_FULL', async () => {
    await withServer(app, async (call) => {
      const stayRes = await call('POST', '/stays', ADMIN_ID, { name: 'Udaipur Hotel' });
      assert.equal(stayRes.status, 201);
      const stay = stayRes.json.data;
      const boysType = stay.roomTypes.find((t) => t.key === 'boys');

      // Allow everyone for this pure capacity-race test via a custom open room type
      const customRes = await call('PUT', `/stays/${stay.id}/room-types`, ADMIN_ID, {
        roomTypes: [
          ...stay.roomTypes,
          {
            key: 'open_race',
            label: 'Open Race',
            colorHex: '#10B981',
            allowedRoles: ['student', 'coordinator', 'admin'],
            allowedGenders: null,
          },
        ],
      });
      assert.equal(customRes.status, 200);
      const raceType = customRes.json.data.find((t) => t.key === 'open_race');
      assert.ok(boysType && raceType);

      await call('POST', `/stays/${stay.id}/layout/generate`, ADMIN_ID, {
        mode: 'add',
        rooms: [{ roomNo: '101', floor: '1st', capacity: 4, roomTypeId: raceType.id }],
      });
      await call('PATCH', `/stays/${stay.id}`, ADMIN_ID, { selectionStatus: 'open' });

      const gridRes = await call('GET', `/stays/${stay.id}/rooms`, ADMIN_ID);
      const roomId = gridRes.json.data.rooms[0].id;

      // Pick 60 distinct approved users (30 boys + 25 girls + 5 coordinators)
      const sixtyUsers = Array.from(store.profileMap.values())
        .filter((p) => p.role !== 'admin' && p.gender !== null)
        .slice(0, 60);
      assert.equal(sixtyUsers.length, 60);

      const results = await Promise.all(
        sixtyUsers.map((u) =>
          call('POST', `/stays/${stay.id}/rooms/${roomId}/select`, u.id, null, {
            'X-Request-Id': `race-${u.id}`,
          })
        )
      );

      const successes = results.filter((r) => r.status === 200 && r.json?.ok === true);
      const fulls = results.filter((r) => r.status === 409 && r.json?.error?.code === 'ROOM_FULL');

      assert.equal(successes.length, 4, 'Exactly 4 users must claim the 4 beds');
      assert.equal(fulls.length, 56, 'Remaining 56 must receive ROOM_FULL');

      const afterGrid = await call('GET', `/stays/${stay.id}/rooms`, ADMIN_ID);
      assert.equal(afterGrid.json.data.rooms[0].occupant_count, 4);
      assert.equal(store.occupants.filter((o) => o.room_id === roomId).length, 4);
    });
  });

  it('2. Same-user race: 10 parallel selects for 10 rooms -> exactly 1 succeeds', async () => {
    await withServer(app, async (call) => {
      const stayRes = await call('POST', '/stays', ADMIN_ID, { name: 'Jaipur Stay' });
      const stay = stayRes.json.data;
      const boysType = stay.roomTypes.find((t) => t.key === 'boys');

      const roomsBatch = Array.from({ length: 10 }, (_, i) => ({
        roomNo: `20${i}`,
        floor: '2nd',
        capacity: 4,
        roomTypeId: boysType.id,
      }));
      await call('POST', `/stays/${stay.id}/layout/generate`, ADMIN_ID, {
        mode: 'add',
        rooms: roomsBatch,
      });
      await call('PATCH', `/stays/${stay.id}`, ADMIN_ID, { selectionStatus: 'open' });

      const gridRes = await call('GET', `/stays/${stay.id}/rooms`, ADMIN_ID);
      const roomIds = gridRes.json.data.rooms.map((r) => r.id);
      const boy1 = makeUuid('bbbbbbbb-bbbb-4bbb-8bbb', 1);

      const results = await Promise.all(
        roomIds.map((rid, idx) =>
          call('POST', `/stays/${stay.id}/rooms/${rid}/select`, boy1, null, {
            'X-Request-Id': `same-user-${idx}`,
          })
        )
      );

      const okCount = results.filter((r) => r.status === 200).length;
      const alreadyCount = results.filter((r) => r.json?.error?.code === 'ALREADY_HAS_ROOM').length;

      assert.equal(okCount, 1);
      assert.equal(alreadyCount, 9);
      assert.equal(store.occupants.filter((o) => o.user_id === boy1).length, 1);
    });
  });

  it('3. Swap test: simultaneous bidirectional switch_room -> zero deadlock, valid end state', async () => {
    await withServer(app, async (call) => {
      const stayRes = await call('POST', '/stays', ADMIN_ID, { name: 'Swap Stay' });
      const stay = stayRes.json.data;
      const boysType = stay.roomTypes.find((t) => t.key === 'boys');

      await call('POST', `/stays/${stay.id}/layout/generate`, ADMIN_ID, {
        mode: 'add',
        rooms: [
          { roomNo: '301', floor: '3rd', capacity: 2, roomTypeId: boysType.id },
          { roomNo: '302', floor: '3rd', capacity: 2, roomTypeId: boysType.id },
        ],
      });
      await call('PATCH', `/stays/${stay.id}`, ADMIN_ID, { selectionStatus: 'open' });

      const gridRes = await call('GET', `/stays/${stay.id}/rooms`, ADMIN_ID);
      const [r1, r2] = gridRes.json.data.rooms;
      const boy1 = makeUuid('bbbbbbbb-bbbb-4bbb-8bbb', 1);
      const boy2 = makeUuid('bbbbbbbb-bbbb-4bbb-8bbb', 2);

      await call('POST', `/stays/${stay.id}/rooms/${r1.id}/select`, boy1);
      await call('POST', `/stays/${stay.id}/rooms/${r2.id}/select`, boy2);

      // Simultaneous cross-swap
      const [s1, s2] = await Promise.all([
        call('POST', `/stays/${stay.id}/rooms/switch`, boy1, {
          fromRoomId: r1.id,
          toRoomId: r2.id,
        }),
        call('POST', `/stays/${stay.id}/rooms/switch`, boy2, {
          fromRoomId: r2.id,
          toRoomId: r1.id,
        }),
      ]);

      assert.equal(s1.status, 200);
      assert.equal(s2.status, 200);

      const b1Occ = store.occupants.find((o) => o.user_id === boy1);
      const b2Occ = store.occupants.find((o) => o.user_id === boy2);
      assert.equal(b1Occ.room_id, r2.id);
      assert.equal(b2Occ.room_id, r1.id);

      const reconcile = await call('POST', `/stays/${stay.id}/reconcile`, ADMIN_ID);
      assert.equal(reconcile.json.data.fixed, 0);
    });
  });

  it('4 & 5. Eligibility, missing gender, window draft/closed, and privacy rules', async () => {
    await withServer(app, async (call) => {
      const stayRes = await call('POST', '/stays', ADMIN_ID, { name: 'Eligibility Hotel' });
      const stay = stayRes.json.data;
      const girlsType = stay.roomTypes.find((t) => t.key === 'girls');
      const boysType = stay.roomTypes.find((t) => t.key === 'boys');
      const staffType = stay.roomTypes.find((t) => t.key === 'staff');

      await call('POST', `/stays/${stay.id}/layout/generate`, ADMIN_ID, {
        mode: 'add',
        rooms: [
          { roomNo: 'G1', floor: '1st', capacity: 2, roomTypeId: girlsType.id },
          { roomNo: 'B1', floor: '1st', capacity: 2, roomTypeId: boysType.id },
          { roomNo: 'S1', floor: '2nd', capacity: 2, roomTypeId: staffType.id },
        ],
      });

      const gridRes = await call('GET', `/stays/${stay.id}/rooms`, ADMIN_ID);
      const gRoom = gridRes.json.data.rooms.find((r) => r.room_no === 'G1');
      const bRoom = gridRes.json.data.rooms.find((r) => r.room_no === 'B1');
      const sRoom = gridRes.json.data.rooms.find((r) => r.room_no === 'S1');

      const boy1 = makeUuid('bbbbbbbb-bbbb-4bbb-8bbb', 1);
      const girl1 = makeUuid('cccccccc-cccc-4ccc-8ccc', 1);
      const coord1 = makeUuid('dddddddd-dddd-4ddd-8ddd', 1); // female coord
      const noGender = makeUuid('eeeeeeee-eeee-4eee-8eee', 1);

      // Draft window rejects selection
      const draftTry = await call('POST', `/stays/${stay.id}/rooms/${bRoom.id}/select`, boy1);
      assert.equal(draftTry.status, 409);
      assert.equal(draftTry.json.error.code, 'WINDOW_CLOSED');

      // Open window
      await call('PATCH', `/stays/${stay.id}`, ADMIN_ID, { selectionStatus: 'open' });

      // Boy -> Girls room blocked
      const boyToGirl = await call('POST', `/stays/${stay.id}/rooms/${gRoom.id}/select`, boy1);
      assert.equal(boyToGirl.status, 403);
      assert.equal(boyToGirl.json.error.code, 'INELIGIBLE_GENDER');

      // Missing gender -> Boys room blocked with profile message
      const noGenderTry = await call('POST', `/stays/${stay.id}/rooms/${bRoom.id}/select`, noGender);
      assert.equal(noGenderTry.status, 403);
      assert.equal(noGenderTry.json.error.code, 'GENDER_REQUIRED');

      // Student -> Staff room blocked
      const studentToStaff = await call('POST', `/stays/${stay.id}/rooms/${sRoom.id}/select`, boy1);
      assert.equal(studentToStaff.status, 403);
      assert.equal(studentToStaff.json.error.code, 'INELIGIBLE_ROLE');

      // Coordinator -> Staff room allowed
      const coordToStaff = await call('POST', `/stays/${stay.id}/rooms/${sRoom.id}/select`, coord1);
      assert.equal(coordToStaff.status, 200);

      // Coordinator -> Girls room blocked when flag is false
      await call('DELETE', `/stays/${stay.id}/rooms/${sRoom.id}/select`, coord1);
      const coordToGirlBlocked = await call('POST', `/stays/${stay.id}/rooms/${gRoom.id}/select`, coord1);
      assert.equal(coordToGirlBlocked.status, 403);

      // Enable coordinator_can_use_gender_rooms -> female coord allowed in Girls room
      await call('PATCH', `/stays/${stay.id}`, ADMIN_ID, { coordinatorCanUseGenderRooms: true });
      const coordToGirlOk = await call('POST', `/stays/${stay.id}/rooms/${gRoom.id}/select`, coord1);
      assert.equal(coordToGirlOk.status, 200);

      // Boy selects B1, Girl selects G1 -> privacy check on occupants endpoint
      await call('POST', `/stays/${stay.id}/rooms/${bRoom.id}/select`, boy1);
      await call('POST', `/stays/${stay.id}/rooms/${gRoom.id}/select`, girl1);

      const boyOwnOcc = await call('GET', `/stays/${stay.id}/rooms/${bRoom.id}/occupants`, boy1);
      assert.equal(boyOwnOcc.status, 200);
      const boyOtherOcc = await call('GET', `/stays/${stay.id}/rooms/${gRoom.id}/occupants`, boy1);
      assert.equal(boyOtherOcc.status, 403);
      const coordAllOcc = await call('GET', `/stays/${stay.id}/rooms/${bRoom.id}/occupants`, coord1);
      assert.equal(coordAllOcc.status, 200);

      // Closed window rejects deselect
      await call('PATCH', `/stays/${stay.id}`, ADMIN_ID, { selectionStatus: 'closed' });
      const closedDeselect = await call('DELETE', `/stays/${stay.id}/rooms/${bRoom.id}/select`, boy1);
      assert.equal(closedDeselect.status, 409);
      assert.equal(closedDeselect.json.error.code, 'WINDOW_CLOSED');
    });
  });

  it('6, 7 & 8. Admin edits, idempotency, rate limit, force override, and CSV export', async () => {
    await withServer(app, async (call) => {
      const stayRes = await call('POST', '/stays', ADMIN_ID, { name: 'Admin Ops Hotel' });
      const stay = stayRes.json.data;
      const boysType = stay.roomTypes.find((t) => t.key === 'boys');
      const girlsType = stay.roomTypes.find((t) => t.key === 'girls');

      await call('POST', `/stays/${stay.id}/layout/generate`, ADMIN_ID, {
        mode: 'add',
        rooms: [
          { roomNo: '101', floor: '1st', capacity: 2, roomTypeId: boysType.id },
          { roomNo: '102', floor: '1st', capacity: 2, roomTypeId: boysType.id },
        ],
      });
      await call('PATCH', `/stays/${stay.id}`, ADMIN_ID, { selectionStatus: 'open' });

      const gridRes = await call('GET', `/stays/${stay.id}/rooms`, ADMIN_ID);
      const r101 = gridRes.json.data.rooms.find((r) => r.room_no === '101');
      const boy1 = makeUuid('bbbbbbbb-bbbb-4bbb-8bbb', 1);
      const boy2 = makeUuid('bbbbbbbb-bbbb-4bbb-8bbb', 2);
      const boy3 = makeUuid('bbbbbbbb-bbbb-4bbb-8bbb', 3);

      // Idempotency test: duplicate X-Request-Id returns identical response without double-applying
      const idempA = await call('POST', `/stays/${stay.id}/rooms/${r101.id}/select`, boy1, null, {
        'X-Request-Id': 'tap-123',
      });
      const idempB = await call('POST', `/stays/${stay.id}/rooms/${r101.id}/select`, boy1, null, {
        'X-Request-Id': 'tap-123',
      });
      assert.equal(idempA.status, 200);
      assert.equal(idempB.status, 200);
      assert.equal(store.rooms.get(r101.id).occupant_count, 1);

      await call('POST', `/stays/${stay.id}/rooms/${r101.id}/select`, boy2);

      // Reduce capacity below occupancy (2 occupants -> capacity 1) rejected
      const capFail = await call('PATCH', `/rooms/${r101.id}`, ADMIN_ID, { capacity: 1 });
      assert.equal(capFail.status, 409);
      assert.equal(capFail.json.error.code, 'CAPACITY_BELOW_OCCUPANCY');
      assert.equal(capFail.json.error.occupants.length, 2);

      // Change type from boys to girls while boys occupy it -> rejected
      const typeFail = await call('PATCH', `/rooms/${r101.id}`, ADMIN_ID, {
        roomTypeId: girlsType.id,
      });
      assert.equal(typeFail.status, 409);
      assert.equal(typeFail.json.error.code, 'INELIGIBLE_CURRENT_OCCUPANTS');

      // Replace layout rejected while stay has occupants
      const replaceFail = await call('POST', `/stays/${stay.id}/layout/generate`, ADMIN_ID, {
        mode: 'replace',
        rooms: [{ roomNo: '999', floor: '9th', capacity: 2, roomTypeId: boysType.id }],
      });
      assert.equal(replaceFail.status, 409);
      assert.equal(replaceFail.json.error.code, 'STAY_HAS_OCCUPANTS');
      assert.equal(replaceFail.json.error.occupantCount, 2);

      // Delete occupied room rejected without force
      const delFail = await call('DELETE', `/rooms/${r101.id}`, ADMIN_ID);
      assert.equal(delFail.status, 409);
      assert.equal(delFail.json.error.code, 'ROOM_HAS_OCCUPANTS');

      // Admin assign with force=true bypasses capacity
      const forceRes = await call('POST', '/admin/rooms/assign', ADMIN_ID, {
        userId: boy3,
        roomId: r101.id,
        force: true,
      });
      assert.equal(forceRes.status, 200);
      assert.equal(store.rooms.get(r101.id).occupant_count, 3);

      // Reconcile fixes artificial drift
      store.rooms.get(r101.id).occupant_count = 99;
      const recRes = await call('POST', `/stays/${stay.id}/reconcile`, ADMIN_ID);
      assert.equal(recRes.status, 200);
      assert.equal(recRes.json.data.fixed, 1);
      assert.equal(store.rooms.get(r101.id).occupant_count, 3);

      // CSV export allowed for admin, forbidden for coordinator
      const coordId = makeUuid('dddddddd-dddd-4ddd-8ddd', 1);
      const coordCsv = await call('GET', `/stays/${stay.id}/export.csv`, coordId);
      assert.equal(coordCsv.status, 403);
      const adminCsv = await call('GET', `/stays/${stay.id}/export.csv`, ADMIN_ID);
      assert.equal(adminCsv.status, 200);
      assert.match(adminCsv.json, /Room No,Floor,Type/);
      assert.match(adminCsv.json, /Boy Student 1/);
    });
  });

  it('9. Full 60-user rehearsal: 25 girls, 30 boys, 5 coordinators select concurrently', async () => {
    await withServer(app, async (call) => {
      const stayRes = await call('POST', '/stays', ADMIN_ID, { name: 'Rehearsal Grand Hotel' });
      const stay = stayRes.json.data;
      const girlsType = stay.roomTypes.find((t) => t.key === 'girls');
      const boysType = stay.roomTypes.find((t) => t.key === 'boys');
      const staffType = stay.roomTypes.find((t) => t.key === 'staff');

      // 7 girls rooms x 4 = 28 beds; 8 boys rooms x 4 = 32 beds; 3 staff rooms x 2 = 6 beds
      const batch = [
        ...Array.from({ length: 7 }, (_, i) => ({
          roomNo: `G-${101 + i}`,
          floor: '1st Floor',
          capacity: 4,
          roomTypeId: girlsType.id,
        })),
        ...Array.from({ length: 8 }, (_, i) => ({
          roomNo: `B-${201 + i}`,
          floor: '2nd Floor',
          capacity: 4,
          roomTypeId: boysType.id,
        })),
        ...Array.from({ length: 3 }, (_, i) => ({
          roomNo: `S-${301 + i}`,
          floor: '3rd Floor',
          capacity: 2,
          roomTypeId: staffType.id,
        })),
      ];

      const genRes = await call('POST', `/stays/${stay.id}/layout/generate`, ADMIN_ID, {
        mode: 'add',
        rooms: batch,
      });
      assert.equal(genRes.status, 200);
      assert.equal(genRes.json.data.inserted, 18);

      await call('PATCH', `/stays/${stay.id}`, ADMIN_ID, { selectionStatus: 'open' });
      const gridRes = await call('GET', `/stays/${stay.id}/rooms`, ADMIN_ID);
      const allRooms = gridRes.json.data.rooms;

      const girlRooms = allRooms.filter((r) => r.type_key === 'girls');
      const boyRooms = allRooms.filter((r) => r.type_key === 'boys');
      const staffRooms = allRooms.filter((r) => r.type_key === 'staff');

      // Assign each group concurrently with retries on ROOM_FULL just like real clients
      async function pickRoomWithRetry(userId, candidateRooms) {
        for (const r of candidateRooms) {
          const res = await call('POST', `/stays/${stay.id}/rooms/${r.id}/select`, userId);
          if (res.status === 200) return res;
          if (res.json?.error?.code !== 'ROOM_FULL') return res;
        }
        throw new Error(`No room available for ${userId}`);
      }

      const boys = Array.from({ length: 30 }, (_, i) => makeUuid('bbbbbbbb-bbbb-4bbb-8bbb', i + 1));
      const girls = Array.from({ length: 25 }, (_, i) => makeUuid('cccccccc-cccc-4ccc-8ccc', i + 1));
      const coords = Array.from({ length: 5 }, (_, i) => makeUuid('dddddddd-dddd-4ddd-8ddd', i + 1));

      const results = await Promise.all([
        ...boys.map((id, idx) =>
          pickRoomWithRetry(id, [...boyRooms.slice(idx % boyRooms.length), ...boyRooms])
        ),
        ...girls.map((id, idx) =>
          pickRoomWithRetry(id, [...girlRooms.slice(idx % girlRooms.length), ...girlRooms])
        ),
        ...coords.map((id, idx) =>
          pickRoomWithRetry(id, [...staffRooms.slice(idx % staffRooms.length), ...staffRooms])
        ),
      ]);

      assert.equal(results.filter((r) => r.status === 200).length, 60);

      // Verify consistency & unallocated list (only Admin + 1 no-gender student remain)
      const reconcile = await call('POST', `/stays/${stay.id}/reconcile`, ADMIN_ID);
      assert.equal(reconcile.json.data.fixed, 0);

      const unalloc = await call('GET', `/stays/${stay.id}/unallocated`, ADMIN_ID);
      assert.equal(unalloc.json.data.allocatedCount, 60);
      assert.equal(unalloc.json.data.unallocatedCount, 2); // Chief Admin + No Gender Student
    });
  });
});
