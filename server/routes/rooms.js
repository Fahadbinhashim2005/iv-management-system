import { Router } from 'express';
import { requireAuth, supabaseAdmin } from '../middleware/auth.js';
import { SlidingWindowLimiter } from '../services/attendanceService.js';
import {
  UUID_REGEX,
  VALID_GENDERS,
  VALID_SELECTION_STATUSES,
  IdempotencyCache,
  checkEligibilityLocal,
  createSupabaseRoomStore,
  escapeCsvCell,
  mapRpcErrorStatus,
  sendError,
  sendOk,
} from '../services/roomAllocationStore.js';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const SLUG_REGEX = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const VALID_ROLES = ['student', 'coordinator', 'admin'];

function isValidUuid(v) {
  return typeof v === 'string' && UUID_REGEX.test(v);
}

export function createRoomsRouter({
  store,
  requireAuthMiddleware = requireAuth,
} = {}) {
  const router = Router();
  const dataStore =
    store ||
    createSupabaseRoomStore(() => {
      if (!supabaseAdmin) {
        const err = new Error(
          'Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Configure both in Railway Variables.'
        );
        err.statusCode = 503;
        err.code = 'SERVER_NOT_CONFIGURED';
        throw err;
      }
      return supabaseAdmin;
    });

  // 10 requests per user per 10 seconds on select / deselect / switch
  const selectionLimiter = new SlidingWindowLimiter({ windowMs: 10_000, max: 10 });
  const idempotency = new IdempotencyCache(60_000);

  router.use(requireAuthMiddleware);

  // Always resolve caller's authoritative role & gender from DB
  async function loadAuthoritativeCaller(req, res) {
    const caller = await dataStore.getCallerProfile(req);
    if (!caller) {
      sendError(res, 403, 'USER_NOT_FOUND', 'User profile not found in database.');
      return null;
    }
    if (
      caller.role !== 'admin' &&
      (caller.approval_status !== 'approved' || caller.is_active === false)
    ) {
      sendError(res, 403, 'USER_INACTIVE', 'Your account is not active or approved.');
      return null;
    }
    return caller;
  }

  function requireAdminCaller(caller, res) {
    if (caller.role !== 'admin') {
      sendError(res, 403, 'FORBIDDEN', 'Administrator privileges required.');
      return false;
    }
    return true;
  }

  function requireStaffCaller(caller, res) {
    if (caller.role !== 'admin' && caller.role !== 'coordinator') {
      sendError(res, 403, 'FORBIDDEN', 'Coordinator or administrator privileges required.');
      return false;
    }
    return true;
  }

  // Idempotency wrapper for X-Request-Id on select/deselect/switch
  async function runIdempotent(req, res, callerId, handler) {
    const rawKey = req.headers['x-request-id'];
    const reqId = typeof rawKey === 'string' ? rawKey.trim() : '';
    if (reqId.length > 128) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'X-Request-Id header too long.');
    }

    const cacheKey = reqId ? `${callerId}:${req.method}:${req.originalUrl}:${reqId}` : null;
    if (cacheKey) {
      const cached = idempotency.get(cacheKey);
      if (cached) {
        return res.status(cached.status).json(cached.body);
      }
      const pending = idempotency.getInFlight(cacheKey);
      if (pending) {
        const result = await pending;
        return res.status(result.status).json(result.body);
      }
    }

    const execPromise = (async () => {
      try {
        return await handler();
      } catch (err) {
        return {
          status: err.statusCode || 500,
          body: {
            ok: false,
            error: {
              code: err.code || 'INTERNAL_ERROR',
              message: err.message || 'Room operation failed.',
            },
          },
        };
      }
    })();

    if (cacheKey) {
      idempotency.setInFlight(cacheKey, execPromise);
    }

    try {
      const outcome = await execPromise;
      if (cacheKey) {
        idempotency.set(cacheKey, outcome.status, outcome.body);
      }
      if (outcome.body?.error?.code === 'BUSY_RETRY') {
        res.setHeader('Retry-After', '1');
      }
      return res.status(outcome.status).json(outcome.body);
    } finally {
      if (cacheKey) {
        idempotency.clearInFlight(cacheKey);
      }
    }
  }

  function outcomeFromRpc(rpcResult) {
    if (rpcResult?.ok) {
      return { status: 200, body: { ok: true, data: rpcResult } };
    }
    const code = rpcResult?.code || 'REQUEST_FAILED';
    const status = mapRpcErrorStatus(code);
    return {
      status,
      body: {
        ok: false,
        error: {
          code,
          message: rpcResult?.message || 'Operation failed.',
          ...(rpcResult?.currentRoomId ? { currentRoomId: rpcResult.currentRoomId } : {}),
          ...(rpcResult?.currentRoomNo ? { currentRoomNo: rpcResult.currentRoomNo } : {}),
          ...(rpcResult?.occupants ? { occupants: rpcResult.occupants } : {}),
          ...(rpcResult?.occupantCount !== undefined ? { occupantCount: rpcResult.occupantCount } : {}),
        },
      },
    };
  }

  // ===========================================================================
  // STAYS
  // ===========================================================================

  router.get('/stays', async (req, res) => {
    try {
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller) return;
      const stays = await dataStore.listStays(req);
      return sendOk(res, stays);
    } catch (err) {
      console.error('[GET /stays Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.post('/stays', async (req, res) => {
    try {
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireAdminCaller(caller, res)) return;

      const { name, visitId = null, opensAt = null, closesAt = null, coordinatorCanUseGenderRooms = false } =
        req.body || {};
      const cleanName = typeof name === 'string' ? name.trim() : '';
      if (cleanName.length < 2 || cleanName.length > 120) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Stay name must be between 2 and 120 characters.');
      }
      if (visitId && !isValidUuid(visitId)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid visitId.');
      }
      let parsedOpens = null;
      if (opensAt) {
        const d = new Date(opensAt);
        if (Number.isNaN(d.getTime())) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid opensAt.');
        parsedOpens = d.toISOString();
      }
      let parsedCloses = null;
      if (closesAt) {
        const d = new Date(closesAt);
        if (Number.isNaN(d.getTime())) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid closesAt.');
        parsedCloses = d.toISOString();
      }

      const created = await dataStore.createStay(req, {
        name: cleanName,
        visitId,
        opensAt: parsedOpens,
        closesAt: parsedCloses,
        coordinatorCanUseGenderRooms: Boolean(coordinatorCanUseGenderRooms),
        createdBy: caller.id,
      });
      return sendOk(res, created, 201);
    } catch (err) {
      console.error('[POST /stays Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.get('/stays/:stayId', async (req, res) => {
    try {
      if (!isValidUuid(req.params.stayId)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId.');
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller) return;

      const grid = await dataStore.getRoomGrid(req, req.params.stayId, caller.id);
      if (!grid) return sendError(res, 404, 'STAY_NOT_FOUND', 'Stay not found.');

      const result = {
        stay: grid.stay,
        roomTypes: grid.roomTypes,
      };
      if (caller.role === 'admin' || caller.role === 'coordinator') {
        result.headcounts = await dataStore.getHeadcounts(req);
      }
      return sendOk(res, result);
    } catch (err) {
      console.error('[GET /stays/:stayId Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.patch('/stays/:stayId', async (req, res) => {
    try {
      if (!isValidUuid(req.params.stayId)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId.');
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireAdminCaller(caller, res)) return;

      const { name, selectionStatus, opensAt, closesAt, coordinatorCanUseGenderRooms } = req.body || {};
      const updates = {};

      if (name !== undefined) {
        const cleanName = typeof name === 'string' ? name.trim() : '';
        if (cleanName.length < 2 || cleanName.length > 120) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'Stay name must be 2–120 characters.');
        }
        updates.name = cleanName;
      }
      if (selectionStatus !== undefined) {
        if (!VALID_SELECTION_STATUSES.includes(selectionStatus)) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'selectionStatus must be draft, open, or closed.');
        }
        updates.selection_status = selectionStatus;
      }
      if (opensAt !== undefined) {
        if (!opensAt) {
          updates.opens_at = null;
        } else {
          const d = new Date(opensAt);
          if (Number.isNaN(d.getTime())) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid opensAt.');
          updates.opens_at = d.toISOString();
        }
      }
      if (closesAt !== undefined) {
        if (!closesAt) {
          updates.closes_at = null;
        } else {
          const d = new Date(closesAt);
          if (Number.isNaN(d.getTime())) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid closesAt.');
          updates.closes_at = d.toISOString();
        }
      }
      if (coordinatorCanUseGenderRooms !== undefined) {
        if (typeof coordinatorCanUseGenderRooms !== 'boolean') {
          return sendError(res, 400, 'VALIDATION_ERROR', 'coordinatorCanUseGenderRooms must be boolean.');
        }
        updates.coordinator_can_use_gender_rooms = coordinatorCanUseGenderRooms;
      }

      if (Object.keys(updates).length === 0) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'No valid fields provided.');
      }

      const updated = await dataStore.updateStay(req, req.params.stayId, updates, caller.id);
      if (!updated) return sendError(res, 404, 'STAY_NOT_FOUND', 'Stay not found.');
      return sendOk(res, updated);
    } catch (err) {
      console.error('[PATCH /stays/:stayId Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  // ===========================================================================
  // GRID, ME & OCCUPANTS
  // ===========================================================================

  router.get('/stays/:stayId/rooms', async (req, res) => {
    try {
      if (!isValidUuid(req.params.stayId)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId.');
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller) return;

      const grid = await dataStore.getRoomGrid(req, req.params.stayId, caller.id);
      if (!grid) return sendError(res, 404, 'STAY_NOT_FOUND', 'Stay not found.');
      return sendOk(res, grid);
    } catch (err) {
      console.error('[GET /stays/:stayId/rooms Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.get('/stays/:stayId/me', async (req, res) => {
    try {
      if (!isValidUuid(req.params.stayId)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId.');
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller) return;

      const grid = await dataStore.getRoomGrid(req, req.params.stayId, caller.id);
      if (!grid) return sendError(res, 404, 'STAY_NOT_FOUND', 'Stay not found.');

      const myRoom = grid.rooms.find((r) => r.id === grid.myRoomId) || null;
      const eligibilityByTypeId = {};
      for (const rt of grid.roomTypes) {
        eligibilityByTypeId[rt.id] = checkEligibilityLocal(caller, rt, grid.stay);
      }
      const roommates = myRoom
        ? await dataStore.getRoomOccupants(req, req.params.stayId, myRoom.id)
        : [];

      return sendOk(res, {
        stay: grid.stay,
        profile: {
          id: caller.id,
          fullName: caller.full_name,
          role: caller.role,
          gender: caller.gender,
        },
        myRoom,
        roommates,
        eligibilityByTypeId,
      });
    } catch (err) {
      console.error('[GET /stays/:stayId/me Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.get('/stays/:stayId/rooms/:roomId/occupants', async (req, res) => {
    try {
      const { stayId, roomId } = req.params;
      if (!isValidUuid(stayId) || !isValidUuid(roomId)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId or roomId.');
      }
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller) return;

      const room = await dataStore.getRoomById(req, roomId);
      if (!room || room.stay_id !== stayId) {
        return sendError(res, 404, 'ROOM_NOT_FOUND', 'Room not found in this stay.');
      }

      if (caller.role === 'student') {
        const inRoom = await dataStore.isUserInRoom(req, stayId, roomId, caller.id);
        if (!inRoom) {
          return sendError(
            res,
            403,
            'FORBIDDEN',
            'Students can only view occupants of their own selected room.'
          );
        }
      }

      const occupants = await dataStore.getRoomOccupants(req, stayId, roomId);
      return sendOk(res, { room, occupants });
    } catch (err) {
      console.error('[GET /occupants Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  // ===========================================================================
  // SELF-SELECTION (atomic + rate-limited + idempotent)
  // ===========================================================================

  router.post('/stays/:stayId/rooms/:roomId/select', async (req, res) => {
    try {
      const { stayId, roomId } = req.params;
      if (!isValidUuid(stayId) || !isValidUuid(roomId)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId or roomId.');
      }
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller) return;

      if (!selectionLimiter.allow(caller.id)) {
        return sendError(res, 429, 'RATE_LIMITED', 'Too many room requests. Please wait a few seconds.');
      }

      const room = await dataStore.getRoomById(req, roomId);
      if (!room || room.stay_id !== stayId) {
        return sendError(res, 404, 'ROOM_NOT_FOUND', 'Room not found in this stay.');
      }

      return await runIdempotent(req, res, caller.id, async () => {
        const result = await dataStore.selectRoom(req, { userId: caller.id, roomId });
        return outcomeFromRpc(result);
      });
    } catch (err) {
      console.error('[POST /select Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.delete('/stays/:stayId/rooms/:roomId/select', async (req, res) => {
    try {
      const { stayId, roomId } = req.params;
      if (!isValidUuid(stayId) || !isValidUuid(roomId)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId or roomId.');
      }
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller) return;

      if (!selectionLimiter.allow(caller.id)) {
        return sendError(res, 429, 'RATE_LIMITED', 'Too many room requests. Please wait a few seconds.');
      }

      const room = await dataStore.getRoomById(req, roomId);
      if (!room || room.stay_id !== stayId) {
        return sendError(res, 404, 'ROOM_NOT_FOUND', 'Room not found in this stay.');
      }

      return await runIdempotent(req, res, caller.id, async () => {
        const result = await dataStore.deselectRoom(req, { userId: caller.id, roomId });
        return outcomeFromRpc(result);
      });
    } catch (err) {
      console.error('[DELETE /select Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.post('/stays/:stayId/rooms/switch', async (req, res) => {
    try {
      const { stayId } = req.params;
      const { fromRoomId, toRoomId } = req.body || {};
      if (!isValidUuid(stayId) || !isValidUuid(fromRoomId) || !isValidUuid(toRoomId)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Valid stayId, fromRoomId, and toRoomId are required.');
      }

      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller) return;

      if (!selectionLimiter.allow(caller.id)) {
        return sendError(res, 429, 'RATE_LIMITED', 'Too many room requests. Please wait a few seconds.');
      }

      const [fromRoom, toRoom] = await Promise.all([
        dataStore.getRoomById(req, fromRoomId),
        dataStore.getRoomById(req, toRoomId),
      ]);
      if (!fromRoom || fromRoom.stay_id !== stayId || !toRoom || toRoom.stay_id !== stayId) {
        return sendError(res, 404, 'ROOM_NOT_FOUND', 'Rooms must belong to the selected stay.');
      }

      return await runIdempotent(req, res, caller.id, async () => {
        const result = await dataStore.switchRoom(req, {
          userId: caller.id,
          fromRoomId,
          toRoomId,
        });
        return outcomeFromRpc(result);
      });
    } catch (err) {
      console.error('[POST /switch Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  // ===========================================================================
  // ADMIN: LAYOUT GENERATOR, ROOM TYPES & ROOM CRUD
  // ===========================================================================

  router.put('/stays/:stayId/room-types', async (req, res) => {
    try {
      if (!isValidUuid(req.params.stayId)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId.');
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireAdminCaller(caller, res)) return;

      const { roomTypes } = req.body || {};
      if (!Array.isArray(roomTypes) || roomTypes.length === 0 || roomTypes.length > 20) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'roomTypes must be a non-empty array (max 20).');
      }

      const sanitized = [];
      const seenKeys = new Set();
      for (const rt of roomTypes) {
        const key = String(rt.key || '').trim().toLowerCase();
        const label = String(rt.label || '').trim();
        const colorHex = String(rt.colorHex || rt.color_hex || '').trim();
        const allowedRoles = Array.isArray(rt.allowedRoles || rt.allowed_roles)
          ? (rt.allowedRoles || rt.allowed_roles).map((r) => String(r).toLowerCase())
          : [];
        const rawGenders = rt.allowedGenders ?? rt.allowed_genders ?? null;
        const allowedGenders = Array.isArray(rawGenders) && rawGenders.length > 0
          ? rawGenders.map((g) => String(g).toLowerCase())
          : null;

        if (!SLUG_REGEX.test(key)) {
          return sendError(res, 400, 'VALIDATION_ERROR', `Invalid room type key "${key}". Use lowercase letters, numbers, - or _.`);
        }
        if (seenKeys.has(key)) {
          return sendError(res, 400, 'VALIDATION_ERROR', `Duplicate room type key "${key}".`);
        }
        seenKeys.add(key);

        if (label.length < 1 || label.length > 40) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'Room type label must be 1–40 characters.');
        }
        if (!HEX_COLOR_REGEX.test(colorHex)) {
          return sendError(res, 400, 'VALIDATION_ERROR', `Invalid color hex "${colorHex}" for ${label}.`);
        }
        if (allowedRoles.length === 0 || !allowedRoles.every((r) => VALID_ROLES.includes(r))) {
          return sendError(res, 400, 'VALIDATION_ERROR', `Invalid allowedRoles for ${label}.`);
        }
        if (allowedGenders && !allowedGenders.every((g) => VALID_GENDERS.includes(g))) {
          return sendError(res, 400, 'VALIDATION_ERROR', `Invalid allowedGenders for ${label}.`);
        }
        if (rt.id && !isValidUuid(rt.id)) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid room type id.');
        }

        sanitized.push({
          id: rt.id || undefined,
          key,
          label,
          colorHex,
          allowedRoles,
          allowedGenders,
        });
      }

      const result = await dataStore.upsertRoomTypes(req, {
        adminId: caller.id,
        stayId: req.params.stayId,
        roomTypes: sanitized,
      });

      if (!result.ok) {
        return sendError(res, mapRpcErrorStatus(result.code), result.code, result.message);
      }
      return sendOk(res, result.roomTypes);
    } catch (err) {
      console.error('[PUT /room-types Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.post('/stays/:stayId/layout/generate', async (req, res) => {
    try {
      if (!isValidUuid(req.params.stayId)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId.');
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireAdminCaller(caller, res)) return;

      const { mode = 'add', rooms } = req.body || {};
      if (!['add', 'replace'].includes(mode)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'mode must be "add" or "replace".');
      }
      if (!Array.isArray(rooms) || rooms.length === 0 || rooms.length > 300) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'rooms must contain between 1 and 300 entries.');
      }

      const cleanRooms = [];
      const seenNos = new Set();
      for (const r of rooms) {
        const roomNo = String(r.roomNo ?? r.room_no ?? '').trim();
        const floor = r.floor ? String(r.floor).trim().slice(0, 40) : null;
        const capacity = Number(r.capacity);
        const roomTypeId = r.roomTypeId || r.room_type_id;

        if (!roomNo || roomNo.length > 32) {
          return sendError(res, 400, 'VALIDATION_ERROR', 'Each room must have a valid room_no (1–32 chars).');
        }
        if (seenNos.has(roomNo)) {
          return sendError(res, 400, 'DUPLICATE_ROOM_NO', `Duplicate room number in batch: ${roomNo}`);
        }
        seenNos.add(roomNo);

        if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) {
          return sendError(res, 400, 'VALIDATION_ERROR', `Room ${roomNo}: capacity must be 1–20.`);
        }
        if (!isValidUuid(roomTypeId)) {
          return sendError(res, 400, 'VALIDATION_ERROR', `Room ${roomNo}: valid roomTypeId is required.`);
        }

        cleanRooms.push({
          room_no: roomNo,
          floor,
          capacity,
          room_type_id: roomTypeId,
        });
      }

      const result = await dataStore.generateLayout(req, {
        adminId: caller.id,
        stayId: req.params.stayId,
        mode,
        rooms: cleanRooms,
      });

      const outcome = outcomeFromRpc(result);
      return res.status(outcome.status).json(outcome.body);
    } catch (err) {
      console.error('[POST /layout/generate Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.post('/stays/:stayId/rooms', async (req, res) => {
    try {
      if (!isValidUuid(req.params.stayId)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId.');
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireAdminCaller(caller, res)) return;

      const { roomNo, floor = null, capacity, roomTypeId } = req.body || {};
      const cleanNo = typeof roomNo === 'string' ? roomNo.trim() : '';
      const cap = Number(capacity);
      if (!cleanNo || cleanNo.length > 32) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Valid roomNo (1–32 chars) is required.');
      }
      if (!Number.isInteger(cap) || cap < 1 || cap > 20) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Capacity must be an integer between 1 and 20.');
      }
      if (!isValidUuid(roomTypeId)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Valid roomTypeId is required.');
      }

      const result = await dataStore.generateLayout(req, {
        adminId: caller.id,
        stayId: req.params.stayId,
        mode: 'add',
        rooms: [
          {
            room_no: cleanNo,
            floor: floor ? String(floor).trim().slice(0, 40) : null,
            capacity: cap,
            room_type_id: roomTypeId,
          },
        ],
      });
      const outcome = outcomeFromRpc(result);
      return res.status(outcome.status === 200 ? 201 : outcome.status).json(outcome.body);
    } catch (err) {
      console.error('[POST /stays/:stayId/rooms Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.post('/stays/:stayId/rooms/bulk-update', async (req, res) => {
    try {
      if (!isValidUuid(req.params.stayId)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId.');
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireAdminCaller(caller, res)) return;

      const { roomIds, capacity, roomTypeId, isLocked } = req.body || {};
      if (!Array.isArray(roomIds) || roomIds.length === 0 || roomIds.length > 200) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'roomIds must be an array of 1–200 UUIDs.');
      }
      if (!roomIds.every(isValidUuid)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'All roomIds must be valid UUIDs.');
      }
      if (capacity !== undefined && (!Number.isInteger(Number(capacity)) || Number(capacity) < 1 || Number(capacity) > 20)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'capacity must be between 1 and 20.');
      }
      if (roomTypeId !== undefined && !isValidUuid(roomTypeId)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid roomTypeId.');
      }

      const updated = [];
      const failed = [];
      for (const roomId of roomIds) {
        const result = await dataStore.updateRoom(req, {
          adminId: caller.id,
          roomId,
          capacity: capacity !== undefined ? Number(capacity) : null,
          roomTypeId: roomTypeId ?? null,
          isLocked: typeof isLocked === 'boolean' ? isLocked : null,
        });
        if (result?.ok) {
          updated.push(roomId);
        } else {
          failed.push({ roomId, code: result?.code, message: result?.message });
        }
      }

      return sendOk(res, { updatedCount: updated.length, failedCount: failed.length, updated, failed });
    } catch (err) {
      console.error('[POST /rooms/bulk-update Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.patch('/rooms/:id', async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid room id.');
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireAdminCaller(caller, res)) return;

      const { roomNo, floor, capacity, roomTypeId, isLocked } = req.body || {};
      if (capacity !== undefined && (!Number.isInteger(Number(capacity)) || Number(capacity) < 1 || Number(capacity) > 20)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'capacity must be an integer between 1 and 20.');
      }
      if (roomTypeId !== undefined && !isValidUuid(roomTypeId)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid roomTypeId.');
      }
      if (isLocked !== undefined && typeof isLocked !== 'boolean') {
        return sendError(res, 400, 'VALIDATION_ERROR', 'isLocked must be a boolean.');
      }

      const result = await dataStore.updateRoom(req, {
        adminId: caller.id,
        roomId: req.params.id,
        roomNo: typeof roomNo === 'string' ? roomNo.trim() : null,
        floor: floor !== undefined ? (floor === null ? '' : String(floor).trim()) : null,
        capacity: capacity !== undefined ? Number(capacity) : null,
        roomTypeId: roomTypeId ?? null,
        isLocked: isLocked ?? null,
      });

      const outcome = outcomeFromRpc(result);
      return res.status(outcome.status).json(outcome.body);
    } catch (err) {
      console.error('[PATCH /rooms/:id Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.delete('/rooms/:id', async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid room id.');
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireAdminCaller(caller, res)) return;

      const forceUnassign =
        req.query.force === 'true' || Boolean(req.body?.forceUnassign);

      const result = await dataStore.deleteRoom(req, {
        adminId: caller.id,
        roomId: req.params.id,
        forceUnassign,
      });

      const outcome = outcomeFromRpc(result);
      return res.status(outcome.status).json(outcome.body);
    } catch (err) {
      console.error('[DELETE /rooms/:id Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  // ===========================================================================
  // ADMIN OVERRIDES: ASSIGN / REMOVE / MOVE / RECONCILE
  // ===========================================================================

  router.post('/admin/rooms/assign', async (req, res) => {
    try {
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireAdminCaller(caller, res)) return;

      const { userId, roomId, force = false } = req.body || {};
      if (!isValidUuid(userId) || !isValidUuid(roomId)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Valid userId and roomId are required.');
      }

      const result = await dataStore.adminAssign(req, {
        adminId: caller.id,
        userId,
        roomId,
        force: Boolean(force),
      });
      const outcome = outcomeFromRpc(result);
      return res.status(outcome.status).json(outcome.body);
    } catch (err) {
      console.error('[POST /admin/rooms/assign Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.post('/admin/rooms/remove', async (req, res) => {
    try {
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireAdminCaller(caller, res)) return;

      const { userId, stayId } = req.body || {};
      if (!isValidUuid(userId) || !isValidUuid(stayId)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Valid userId and stayId are required.');
      }

      const result = await dataStore.adminRemove(req, {
        adminId: caller.id,
        userId,
        stayId,
      });
      const outcome = outcomeFromRpc(result);
      return res.status(outcome.status).json(outcome.body);
    } catch (err) {
      console.error('[POST /admin/rooms/remove Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.post('/admin/rooms/move', async (req, res) => {
    try {
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireAdminCaller(caller, res)) return;

      const { userId, toRoomId, force = false } = req.body || {};
      if (!isValidUuid(userId) || !isValidUuid(toRoomId)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Valid userId and toRoomId are required.');
      }

      const result = await dataStore.adminMove(req, {
        adminId: caller.id,
        userId,
        toRoomId,
        force: Boolean(force),
      });
      const outcome = outcomeFromRpc(result);
      return res.status(outcome.status).json(outcome.body);
    } catch (err) {
      console.error('[POST /admin/rooms/move Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.post('/stays/:stayId/reconcile', async (req, res) => {
    try {
      if (!isValidUuid(req.params.stayId)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId.');
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireAdminCaller(caller, res)) return;

      const result = await dataStore.reconcileCounts(req, {
        adminId: caller.id,
        stayId: req.params.stayId,
      });
      return sendOk(res, result);
    } catch (err) {
      console.error('[POST /reconcile Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  // ===========================================================================
  // STAFF VIEWS: UNALLOCATED LIST, CSV EXPORT, AUDIT
  // ===========================================================================

  router.get('/stays/:stayId/unallocated', async (req, res) => {
    try {
      if (!isValidUuid(req.params.stayId)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId.');
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireStaffCaller(caller, res)) return;

      const { role, gender, q } = req.query;
      const result = await dataStore.getUnallocated(req, req.params.stayId, {
        role: role ? String(role) : undefined,
        gender: gender ? String(gender) : undefined,
        q: q ? String(q) : undefined,
      });
      return sendOk(res, result);
    } catch (err) {
      console.error('[GET /unallocated Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.get('/stays/:stayId/export.csv', async (req, res) => {
    try {
      if (!isValidUuid(req.params.stayId)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId.');
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireAdminCaller(caller, res)) return;

      const data = await dataStore.getExportData(req, req.params.stayId);
      if (!data) return sendError(res, 404, 'STAY_NOT_FOUND', 'Stay not found.');

      const header = [
        'Room No',
        'Floor',
        'Type',
        'Occupancy',
        'Locked',
        'Occupant Name',
        'Role',
        'Gender',
        'Roll No',
        'Email',
        'Phone',
        'Assignment Mode',
        'Selected At',
      ];
      const lines = [header.map(escapeCsvCell).join(',')];

      for (const r of data.rooms) {
        if (!r.occupants || r.occupants.length === 0) {
          lines.push(
            [
              r.room_no,
              r.floor || '',
              r.type_label || r.type_key || '',
              `${r.occupant_count}/${r.capacity}`,
              r.is_locked ? 'Yes' : 'No',
              '',
              '',
              '',
              '',
              '',
              '',
              'Empty',
              '',
            ]
              .map(escapeCsvCell)
              .join(',')
          );
          continue;
        }
        for (const occ of r.occupants) {
          const p = occ.profiles || {};
          lines.push(
            [
              r.room_no,
              r.floor || '',
              r.type_label || r.type_key || '',
              `${r.occupant_count}/${r.capacity}`,
              r.is_locked ? 'Yes' : 'No',
              p.full_name || '',
              p.role || '',
              p.gender || '',
              p.roll_no || '',
              p.email || '',
              p.phone || '',
              occ.assigned_by ? 'Admin Assigned' : 'Self Selected',
              occ.created_at || '',
            ]
              .map(escapeCsvCell)
              .join(',')
          );
        }
      }

      const safeSlug = String(data.stay.name || 'stay')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="rooms-${safeSlug || data.stay.id}.csv"`);
      return res.status(200).send(lines.join('\r\n'));
    } catch (err) {
      console.error('[GET /export.csv Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  router.get('/stays/:stayId/audit', async (req, res) => {
    try {
      if (!isValidUuid(req.params.stayId)) return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid stayId.');
      const caller = await loadAuthoritativeCaller(req, res);
      if (!caller || !requireAdminCaller(caller, res)) return;

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const result = await dataStore.getAudit(req, req.params.stayId, { page, limit });
      return sendOk(res, result);
    } catch (err) {
      console.error('[GET /audit Error]:', err);
      return sendError(res, err.statusCode || 500, err.code || 'INTERNAL_ERROR', err.message);
    }
  });

  return router;
}

export default createRoomsRouter();
