import {
  UUID_REGEX,
  escapeCsvCell,
  sendOk,
  sendError,
} from './attendanceService.js';

export { UUID_REGEX, escapeCsvCell, sendOk, sendError };

export const VALID_GENDERS = ['male', 'female', 'other'];
export const VALID_SELECTION_STATUSES = ['draft', 'open', 'closed'];

/**
 * In-memory TTL idempotency cache for X-Request-Id deduplication.
 * Prevents double-taps / retried requests from executing twice, while
 * allowing transient BUSY_RETRY / 5xx responses to be retried safely.
 */
export class IdempotencyCache {
  constructor(ttlMs = 60_000) {
    this.ttlMs = ttlMs;
    this.completed = new Map();
    this.inFlight = new Map();
  }

  get(key) {
    const entry = this.completed.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.completed.delete(key);
      return null;
    }
    return entry;
  }

  getInFlight(key) {
    return this.inFlight.get(key) || null;
  }

  setInFlight(key, promise) {
    this.inFlight.set(key, promise);
  }

  clearInFlight(key) {
    this.inFlight.delete(key);
  }

  set(key, status, body) {
    if (status >= 500 || body?.error?.code === 'BUSY_RETRY') {
      return;
    }
    this.completed.set(key, {
      status,
      body,
      expiresAt: Date.now() + this.ttlMs,
    });
    if (this.completed.size > 2000) {
      const now = Date.now();
      for (const [k, v] of this.completed.entries()) {
        if (now > v.expiresAt) this.completed.delete(k);
      }
    }
  }
}

export function mapRpcErrorStatus(code) {
  switch (code) {
    case 'ROOM_NOT_FOUND':
    case 'STAY_NOT_FOUND':
    case 'USER_NOT_FOUND':
      return 404;
    case 'INELIGIBLE_ROLE':
    case 'INELIGIBLE_GENDER':
    case 'GENDER_REQUIRED':
    case 'USER_INACTIVE':
    case 'FORBIDDEN':
      return 403;
    case 'BUSY_RETRY':
      return 503;
    case 'VALIDATION_ERROR':
    case 'INVALID_ROOM_TYPE':
    case 'STAY_MISMATCH':
      return 400;
    case 'ROOM_FULL':
    case 'ALREADY_HAS_ROOM':
    case 'NOT_IN_ROOM':
    case 'WINDOW_CLOSED':
    case 'WINDOW_NOT_OPEN':
    case 'ROOM_LOCKED':
    case 'STAY_HAS_OCCUPANTS':
    case 'CAPACITY_BELOW_OCCUPANCY':
    case 'INELIGIBLE_CURRENT_OCCUPANTS':
    case 'ROOM_HAS_OCCUPANTS':
    case 'DUPLICATE_ROOM_NO':
    case 'SAME_ROOM':
      return 409;
    default:
      return 400;
  }
}

export function checkEligibilityLocal(user, roomType, stay) {
  const role = String(user?.role || 'student').toLowerCase();
  const gender = user?.gender ? String(user.gender).toLowerCase() : null;
  const allowedRoles = roomType?.allowed_roles || [];
  const allowedGenders = roomType?.allowed_genders || null;

  const roleOk =
    allowedRoles.includes(role) ||
    (role === 'coordinator' &&
      Boolean(stay?.coordinator_can_use_gender_rooms) &&
      ['girls', 'boys'].includes(roomType?.key));

  if (!roleOk) {
    return {
      ok: false,
      code: 'INELIGIBLE_ROLE',
      message: `This room type is not open to ${role}s.`,
    };
  }

  if (Array.isArray(allowedGenders) && allowedGenders.length > 0) {
    if (!gender || !VALID_GENDERS.includes(gender)) {
      return {
        ok: false,
        code: 'GENDER_REQUIRED',
        message: 'Contact admin to update your profile.',
      };
    }
    if (!allowedGenders.includes(gender)) {
      return {
        ok: false,
        code: 'INELIGIBLE_GENDER',
        message: `This room is restricted to ${allowedGenders.join(' / ')} occupants.`,
      };
    }
  }

  return { ok: true };
}

function isWindowOpen(stay, now = new Date()) {
  if (!stay || stay.selection_status !== 'open') {
    return { ok: false, code: 'WINDOW_CLOSED', message: 'Room selection is currently closed.' };
  }
  if (stay.opens_at && new Date(stay.opens_at) > now) {
    return { ok: false, code: 'WINDOW_NOT_OPEN', message: 'Room selection has not opened yet.' };
  }
  if (stay.closes_at && new Date(stay.closes_at) < now) {
    return { ok: false, code: 'WINDOW_CLOSED', message: 'Room selection deadline has passed.' };
  }
  return { ok: true };
}

/**
 * Supabase-backed room allocation store.
 * Every state-changing room operation delegates to an atomic Postgres function.
 */
export function createSupabaseRoomStore(getClient) {
  return {
    async resolveActorUuid(req) {
      if (UUID_REGEX.test(String(req.user?.id || ''))) {
        return req.user.id;
      }
      const sb = getClient(req);
      if (req.user?.email) {
        const { data } = await sb
          .from('profiles')
          .select('id')
          .eq('email', req.user.email.toLowerCase())
          .maybeSingle();
        if (data?.id) return data.id;
      }
      const { data: fallback } = await sb
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();
      return fallback?.id || null;
    },

    async getCallerProfile(req) {
      const sb = getClient(req);
      const actorId = await this.resolveActorUuid(req);
      if (!actorId) return null;
      const { data, error } = await sb
        .from('profiles')
        .select('id, email, full_name, role, gender, phone, roll_no, approval_status, is_active')
        .eq('id', actorId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        role: String(data.role || 'student').toLowerCase(),
        gender: data.gender ? String(data.gender).toLowerCase() : null,
      };
    },

    async listStays(req) {
      const sb = getClient(req);
      const { data: stays, error } = await sb
        .from('stays')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const stayIds = (stays || []).map((s) => s.id);
      if (stayIds.length === 0) return [];

      const { data: rooms } = await sb
        .from('rooms')
        .select('stay_id, capacity, occupant_count')
        .in('stay_id', stayIds);

      const summaryMap = new Map();
      for (const r of rooms || []) {
        const cur = summaryMap.get(r.stay_id) || { roomCount: 0, totalBeds: 0, occupiedBeds: 0 };
        cur.roomCount += 1;
        cur.totalBeds += Number(r.capacity) || 0;
        cur.occupiedBeds += Number(r.occupant_count) || 0;
        summaryMap.set(r.stay_id, cur);
      }

      return (stays || []).map((s) => ({
        ...s,
        summary: summaryMap.get(s.id) || { roomCount: 0, totalBeds: 0, occupiedBeds: 0 },
      }));
    },

    async getStayById(req, stayId) {
      const sb = getClient(req);
      const { data, error } = await sb
        .from('stays')
        .select('*')
        .eq('id', stayId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async createStay(req, { name, visitId, opensAt, closesAt, coordinatorCanUseGenderRooms, createdBy }) {
      const sb = getClient(req);
      const { data: stay, error } = await sb
        .from('stays')
        .insert({
          name,
          visit_id: visitId || null,
          selection_status: 'draft',
          opens_at: opensAt || null,
          closes_at: closesAt || null,
          coordinator_can_use_gender_rooms: Boolean(coordinatorCanUseGenderRooms),
          created_by: createdBy,
        })
        .select('*')
        .single();
      if (error) throw error;

      const { data: roomTypes } = await sb
        .from('room_types')
        .select('*')
        .eq('stay_id', stay.id)
        .order('key', { ascending: true });

      return { ...stay, roomTypes: roomTypes || [] };
    },

    async updateStay(req, stayId, updates, actorId) {
      const sb = getClient(req);
      const existing = await this.getStayById(req, stayId);
      if (!existing) return null;

      const { data, error } = await sb
        .from('stays')
        .update(updates)
        .eq('id', stayId)
        .select('*')
        .single();
      if (error) throw error;

      if (updates.selection_status && updates.selection_status !== existing.selection_status) {
        const action =
          updates.selection_status === 'open'
            ? 'window_open'
            : updates.selection_status === 'closed'
              ? 'window_close'
              : 'stay_updated';
        await sb.from('room_audit_log').insert({
          stay_id: stayId,
          actor_id: actorId,
          action,
          detail: { from: existing.selection_status, to: updates.selection_status },
        });
      }

      return data;
    },

    async getHeadcounts(req) {
      const sb = getClient(req);
      const { data: profiles, error } = await sb
        .from('profiles')
        .select('role, gender, approval_status, is_active');
      if (error) throw error;

      const active = (profiles || []).filter(
        (p) => String(p.role).toLowerCase() === 'admin' || (p.approval_status === 'approved' && p.is_active !== false)
      );

      const counts = {
        totalActive: active.length,
        studentsTotal: 0,
        studentsFemale: 0,
        studentsMale: 0,
        studentsOtherOrUnset: 0,
        coordinatorsTotal: 0,
        adminsTotal: 0,
      };

      for (const p of active) {
        const r = String(p.role || 'student').toLowerCase();
        const g = p.gender ? String(p.gender).toLowerCase() : null;
        if (r === 'student') {
          counts.studentsTotal += 1;
          if (g === 'female') counts.studentsFemale += 1;
          else if (g === 'male') counts.studentsMale += 1;
          else counts.studentsOtherOrUnset += 1;
        } else if (r === 'coordinator') {
          counts.coordinatorsTotal += 1;
        } else if (r === 'admin') {
          counts.adminsTotal += 1;
        }
      }
      return counts;
    },

    async getRoomGrid(req, stayId, callerId) {
      const sb = getClient(req);
      const [stayRes, typesRes, gridRes, mineRes] = await Promise.all([
        sb.from('stays').select('*').eq('id', stayId).maybeSingle(),
        sb.from('room_types').select('*').eq('stay_id', stayId).order('key', { ascending: true }),
        sb
          .from('room_grid_view')
          .select('*')
          .eq('stay_id', stayId)
          .order('floor', { ascending: true, nullsFirst: false })
          .order('room_no', { ascending: true }),
        callerId
          ? sb
              .from('room_occupants')
              .select('room_id')
              .eq('stay_id', stayId)
              .eq('user_id', callerId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (stayRes.error) throw stayRes.error;
      if (!stayRes.data) return null;
      if (typesRes.error) throw typesRes.error;
      if (gridRes.error) throw gridRes.error;

      const myRoomId = mineRes?.data?.room_id || null;
      const rooms = (gridRes.data || []).map((r) => ({
        ...r,
        is_mine: myRoomId ? r.id === myRoomId : false,
      }));

      return {
        stay: stayRes.data,
        roomTypes: typesRes.data || [],
        rooms,
        myRoomId,
      };
    },

    async getRoomById(req, roomId) {
      const sb = getClient(req);
      const { data, error } = await sb
        .from('rooms')
        .select('*, room_types(*)')
        .eq('id', roomId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async getRoomOccupants(req, stayId, roomId) {
      const sb = getClient(req);
      const { data, error } = await sb
        .from('room_occupants')
        .select(
          'id, room_id, stay_id, user_id, assigned_by, created_at, profiles:user_id(id, full_name, email, role, gender, phone, roll_no, department)'
        )
        .eq('stay_id', stayId)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        roomId: row.room_id,
        stayId: row.stay_id,
        fullName: row.profiles?.full_name || 'User',
        email: row.profiles?.email || '',
        role: String(row.profiles?.role || 'student').toLowerCase(),
        gender: row.profiles?.gender || null,
        phone: row.profiles?.phone || null,
        rollNo: row.profiles?.roll_no || null,
        department: row.profiles?.department || null,
        assignedBy: row.assigned_by || null,
        isSelfSelected: !row.assigned_by,
        selectedAt: row.created_at,
      }));
    },

    async isUserInRoom(req, stayId, roomId, userId) {
      const sb = getClient(req);
      const { data, error } = await sb
        .from('room_occupants')
        .select('id')
        .eq('stay_id', stayId)
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },

    async selectRoom(req, { userId, roomId }) {
      const sb = getClient(req);
      const { data, error } = await sb.rpc('select_room', { p_user: userId, p_room: roomId });
      if (error) throw error;
      return data;
    },

    async deselectRoom(req, { userId, roomId }) {
      const sb = getClient(req);
      const { data, error } = await sb.rpc('deselect_room', { p_user: userId, p_room: roomId });
      if (error) throw error;
      return data;
    },

    async switchRoom(req, { userId, fromRoomId, toRoomId }) {
      const sb = getClient(req);
      const { data, error } = await sb.rpc('switch_room', {
        p_user: userId,
        p_from: fromRoomId,
        p_to: toRoomId,
      });
      if (error) throw error;
      return data;
    },

    async adminAssign(req, { adminId, userId, roomId, force = false }) {
      const sb = getClient(req);
      const { data, error } = await sb.rpc('admin_assign', {
        p_admin: adminId,
        p_user: userId,
        p_room: roomId,
        p_force: Boolean(force),
      });
      if (error) throw error;
      return data;
    },

    async adminRemove(req, { adminId, userId, stayId }) {
      const sb = getClient(req);
      const { data, error } = await sb.rpc('admin_remove', {
        p_admin: adminId,
        p_user: userId,
        p_stay: stayId,
      });
      if (error) throw error;
      return data;
    },

    async adminMove(req, { adminId, userId, toRoomId, force = false }) {
      const sb = getClient(req);
      const { data, error } = await sb.rpc('admin_move', {
        p_admin: adminId,
        p_user: userId,
        p_to_room: toRoomId,
        p_force: Boolean(force),
      });
      if (error) throw error;
      return data;
    },

    async generateLayout(req, { adminId, stayId, mode, rooms }) {
      const sb = getClient(req);
      const { data, error } = await sb.rpc('generate_stay_layout', {
        p_admin: adminId,
        p_stay: stayId,
        p_mode: mode,
        p_rooms: rooms,
      });
      if (error) throw error;
      return data;
    },

    async updateRoom(req, { adminId, roomId, roomNo, floor, capacity, roomTypeId, isLocked }) {
      const sb = getClient(req);
      const { data, error } = await sb.rpc('update_room_safe', {
        p_admin: adminId,
        p_room: roomId,
        p_room_no: roomNo ?? null,
        p_floor: floor ?? null,
        p_capacity: capacity ?? null,
        p_room_type_id: roomTypeId ?? null,
        p_is_locked: isLocked ?? null,
      });
      if (error) throw error;
      return data;
    },

    async deleteRoom(req, { adminId, roomId, forceUnassign = false }) {
      const sb = getClient(req);
      const { data, error } = await sb.rpc('delete_room_safe', {
        p_admin: adminId,
        p_room: roomId,
        p_force_unassign: Boolean(forceUnassign),
      });
      if (error) throw error;
      return data;
    },

    async upsertRoomTypes(req, { adminId, stayId, roomTypes }) {
      const sb = getClient(req);
      const stay = await this.getStayById(req, stayId);
      if (!stay) return { ok: false, code: 'STAY_NOT_FOUND', message: 'Stay not found.' };

      const { data: existingTypes, error: exErr } = await sb
        .from('room_types')
        .select('*')
        .eq('stay_id', stayId);
      if (exErr) throw exErr;

      const byId = new Map((existingTypes || []).map((t) => [t.id, t]));
      const byKey = new Map((existingTypes || []).map((t) => [t.key, t]));

      for (const rt of roomTypes) {
        const target = (rt.id && byId.get(rt.id)) || byKey.get(rt.key);
        if (target) {
          // Verify existing occupants in rooms of this type remain eligible if rules tightened
          const { data: occRows } = await sb
            .from('room_occupants')
            .select('rooms!inner(room_type_id), profiles:user_id(full_name, role, gender)')
            .eq('stay_id', stayId)
            .eq('rooms.room_type_id', target.id);

          const ineligible = [];
          for (const row of occRows || []) {
            const check = checkEligibilityLocal(
              row.profiles,
              {
                key: target.key,
                allowed_roles: rt.allowedRoles,
                allowed_genders: rt.allowedGenders,
              },
              stay
            );
            if (!check.ok) ineligible.push(row.profiles?.full_name || 'Occupant');
          }
          if (ineligible.length > 0) {
            return {
              ok: false,
              code: 'INELIGIBLE_CURRENT_OCCUPANTS',
              message: `Cannot tighten rules on "${target.label}": ineligible occupants already placed (${ineligible.join(', ')}).`,
            };
          }

          const { error: upErr } = await sb
            .from('room_types')
            .update({
              label: rt.label,
              color_hex: rt.colorHex,
              allowed_roles: rt.allowedRoles,
              allowed_genders: rt.allowedGenders,
            })
            .eq('id', target.id);
          if (upErr) throw upErr;
        } else {
          const { error: insErr } = await sb.from('room_types').insert({
            stay_id: stayId,
            key: rt.key,
            label: rt.label,
            color_hex: rt.colorHex,
            allowed_roles: rt.allowedRoles,
            allowed_genders: rt.allowedGenders,
          });
          if (insErr) throw insErr;
        }
      }

      const { data: updated } = await sb
        .from('room_types')
        .select('*')
        .eq('stay_id', stayId)
        .order('key', { ascending: true });

      await sb.from('room_audit_log').insert({
        stay_id: stayId,
        actor_id: adminId,
        action: 'room_types_updated',
        detail: { count: (updated || []).length },
      });

      return { ok: true, roomTypes: updated || [] };
    },

    async getUnallocated(req, stayId, { role, gender, q } = {}) {
      const sb = getClient(req);
      const [profilesRes, occRes] = await Promise.all([
        sb
          .from('profiles')
          .select('id, email, full_name, role, gender, phone, roll_no, department, batch, approval_status, is_active')
          .order('full_name', { ascending: true }),
        sb.from('room_occupants').select('user_id').eq('stay_id', stayId),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (occRes.error) throw occRes.error;

      const allocatedSet = new Set((occRes.data || []).map((o) => o.user_id));
      const eligibleUsers = (profilesRes.data || []).filter(
        (p) =>
          String(p.role).toLowerCase() === 'admin' ||
          (p.approval_status === 'approved' && p.is_active !== false)
      );

      let unallocated = eligibleUsers
        .filter((p) => !allocatedSet.has(p.id))
        .map((p) => ({
          id: p.id,
          email: p.email,
          fullName: p.full_name,
          role: String(p.role || 'student').toLowerCase(),
          gender: p.gender ? String(p.gender).toLowerCase() : null,
          phone: p.phone || null,
          rollNo: p.roll_no || null,
          department: p.department || null,
          batch: p.batch || null,
        }));

      if (role && ['student', 'coordinator', 'admin'].includes(role.toLowerCase())) {
        unallocated = unallocated.filter((u) => u.role === role.toLowerCase());
      }
      if (gender) {
        const g = gender.toLowerCase();
        if (g === 'unset') {
          unallocated = unallocated.filter((u) => !u.gender);
        } else if (VALID_GENDERS.includes(g)) {
          unallocated = unallocated.filter((u) => u.gender === g);
        }
      }
      if (q && q.trim()) {
        const needle = q.trim().toLowerCase();
        unallocated = unallocated.filter((u) =>
          `${u.fullName} ${u.email} ${u.rollNo || ''} ${u.department || ''}`
            .toLowerCase()
            .includes(needle)
        );
      }

      return {
        totalEligible: eligibleUsers.length,
        allocatedCount: eligibleUsers.length - eligibleUsers.filter((p) => !allocatedSet.has(p.id)).length,
        unallocatedCount: unallocated.length,
        users: unallocated,
      };
    },

    async getExportData(req, stayId) {
      const sb = getClient(req);
      const [stayRes, roomsRes, occRes] = await Promise.all([
        sb.from('stays').select('*').eq('id', stayId).maybeSingle(),
        sb
          .from('room_grid_view')
          .select('*')
          .eq('stay_id', stayId)
          .order('floor', { ascending: true, nullsFirst: false })
          .order('room_no', { ascending: true }),
        sb
          .from('room_occupants')
          .select('room_id, assigned_by, created_at, profiles:user_id(full_name, email, role, gender, roll_no, phone, department)')
          .eq('stay_id', stayId)
          .order('created_at', { ascending: true }),
      ]);

      if (stayRes.error) throw stayRes.error;
      if (!stayRes.data) return null;
      if (roomsRes.error) throw roomsRes.error;
      if (occRes.error) throw occRes.error;

      const occByRoom = new Map();
      for (const o of occRes.data || []) {
        const list = occByRoom.get(o.room_id) || [];
        list.push(o);
        occByRoom.set(o.room_id, list);
      }

      return {
        stay: stayRes.data,
        rooms: (roomsRes.data || []).map((r) => ({
          ...r,
          occupants: occByRoom.get(r.id) || [],
        })),
      };
    },

    async reconcileCounts(req, { adminId, stayId }) {
      const sb = getClient(req);
      const { data, error } = await sb.rpc('reconcile_room_counts', {
        p_admin: adminId,
        p_stay: stayId,
      });
      if (error) throw error;
      return data;
    },

    async getAudit(req, stayId, { page = 1, limit = 50 } = {}) {
      const sb = getClient(req);
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, error, count } = await sb
        .from('room_audit_log')
        .select('*', { count: 'exact' })
        .eq('stay_id', stayId)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return {
        items: data || [],
        total: count || 0,
        page,
        limit,
      };
    },
  };
}

/**
 * In-memory atomic store for automated concurrency/unit testing and offline fallback.
 * Uses per-room async mutex queues locked in ascending UUID order to mirror
 * Postgres row-level locking semantics without table locks.
 */
export function createMemoryRoomStore({ profiles = [] } = {}) {
  const stays = new Map();
  const roomTypes = new Map();
  const rooms = new Map();
  const occupants = []; // { id, room_id, stay_id, user_id, assigned_by, created_at }
  const audits = [];
  const profileMap = new Map(profiles.map((p) => [p.id, { ...p }]));
  const roomLocks = new Map();

  let seq = 1;
  const nextUuid = (prefix = '77777777-7777-4777-8777') => {
    const hex = String(seq++).padStart(12, '0');
    return `${prefix}-${hex}`;
  };

  async function withLocks(ids, fn) {
    const uniqueSorted = Array.from(new Set(ids.filter(Boolean))).sort();
    const releases = [];
    for (const id of uniqueSorted) {
      let prev = roomLocks.get(id) || Promise.resolve();
      let releaseFn;
      const next = new Promise((resolve) => {
        releaseFn = resolve;
      });
      roomLocks.set(id, prev.then(() => next));
      await prev;
      releases.push(() => {
        releaseFn();
        if (roomLocks.get(id) === next) {
          roomLocks.delete(id);
        }
      });
    }
    try {
      return await fn();
    } finally {
      for (let i = releases.length - 1; i >= 0; i--) {
        releases[i]();
      }
    }
  }

  function seedDefaultTypes(stayId) {
    const defaults = [
      { id: nextUuid('88888888-8888-4888-8888'), stay_id: stayId, key: 'girls', label: 'Girls', color_hex: '#EC4899', allowed_roles: ['student'], allowed_genders: ['female'] },
      { id: nextUuid('88888888-8888-4888-8888'), stay_id: stayId, key: 'boys', label: 'Boys', color_hex: '#3B82F6', allowed_roles: ['student'], allowed_genders: ['male'] },
      { id: nextUuid('88888888-8888-4888-8888'), stay_id: stayId, key: 'staff', label: 'Staff', color_hex: '#F59E0B', allowed_roles: ['coordinator', 'admin'], allowed_genders: null },
    ];
    for (const dt of defaults) roomTypes.set(dt.id, dt);
    return defaults;
  }

  return {
    stays,
    roomTypes,
    rooms,
    occupants,
    audits,
    profileMap,

    async resolveActorUuid(req) {
      return req.user?.id || null;
    },

    async getCallerProfile(req) {
      const p = profileMap.get(req.user?.id);
      if (p) return { ...p, role: String(p.role).toLowerCase() };
      if (req.user?.id) {
        return {
          id: req.user.id,
          email: req.user.email || '',
          full_name: req.user.name || 'User',
          role: String(req.user.role || 'student').toLowerCase(),
          gender: req.user.gender || null,
          approval_status: req.user.approval_status || 'approved',
          is_active: req.user.is_active !== false,
        };
      }
      return null;
    },

    async listStays() {
      return Array.from(stays.values()).map((s) => {
        const stayRooms = Array.from(rooms.values()).filter((r) => r.stay_id === s.id);
        return {
          ...s,
          summary: {
            roomCount: stayRooms.length,
            totalBeds: stayRooms.reduce((acc, r) => acc + r.capacity, 0),
            occupiedBeds: stayRooms.reduce((acc, r) => acc + r.occupant_count, 0),
          },
        };
      });
    },

    async getStayById(_req, stayId) {
      return stays.get(stayId) || null;
    },

    async createStay(_req, { name, visitId, opensAt, closesAt, coordinatorCanUseGenderRooms, createdBy }) {
      const id = nextUuid('66666666-6666-4666-8666');
      const stay = {
        id,
        visit_id: visitId || null,
        name,
        selection_status: 'draft',
        opens_at: opensAt || null,
        closes_at: closesAt || null,
        coordinator_can_use_gender_rooms: Boolean(coordinatorCanUseGenderRooms),
        created_by: createdBy || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      stays.set(id, stay);
      const types = seedDefaultTypes(id);
      return { ...stay, roomTypes: types };
    },

    async updateStay(_req, stayId, updates, actorId) {
      const s = stays.get(stayId);
      if (!s) return null;
      const updated = { ...s, ...updates, updated_at: new Date().toISOString() };
      stays.set(stayId, updated);
      if (updates.selection_status && updates.selection_status !== s.selection_status) {
        audits.push({
          stay_id: stayId,
          actor_id: actorId,
          action: updates.selection_status === 'open' ? 'window_open' : 'window_close',
          detail: { from: s.selection_status, to: updates.selection_status },
        });
      }
      return updated;
    },

    async getHeadcounts() {
      const active = Array.from(profileMap.values()).filter(
        (p) => p.role === 'admin' || (p.approval_status === 'approved' && p.is_active !== false)
      );
      return {
        totalActive: active.length,
        studentsTotal: active.filter((p) => p.role === 'student').length,
        studentsFemale: active.filter((p) => p.role === 'student' && p.gender === 'female').length,
        studentsMale: active.filter((p) => p.role === 'student' && p.gender === 'male').length,
        studentsOtherOrUnset: active.filter((p) => p.role === 'student' && p.gender !== 'female' && p.gender !== 'male').length,
        coordinatorsTotal: active.filter((p) => p.role === 'coordinator').length,
        adminsTotal: active.filter((p) => p.role === 'admin').length,
      };
    },

    async getRoomGrid(_req, stayId, callerId) {
      const stay = stays.get(stayId);
      if (!stay) return null;
      const types = Array.from(roomTypes.values()).filter((t) => t.stay_id === stayId);
      const typeMap = new Map(types.map((t) => [t.id, t]));
      const myOcc = callerId ? occupants.find((o) => o.stay_id === stayId && o.user_id === callerId) : null;
      const myRoomId = myOcc?.room_id || null;
      const stayRooms = Array.from(rooms.values())
        .filter((r) => r.stay_id === stayId)
        .sort((a, b) => a.room_no.localeCompare(b.room_no))
        .map((r) => {
          const rt = typeMap.get(r.room_type_id);
          return {
            ...r,
            type_key: rt?.key,
            type_label: rt?.label,
            color_hex: rt?.color_hex,
            allowed_roles: rt?.allowed_roles,
            allowed_genders: rt?.allowed_genders,
            is_mine: r.id === myRoomId,
          };
        });
      return { stay, roomTypes: types, rooms: stayRooms, myRoomId };
    },

    async getRoomById(_req, roomId) {
      const r = rooms.get(roomId);
      if (!r) return null;
      return { ...r, room_types: roomTypes.get(r.room_type_id) };
    },

    async getRoomOccupants(_req, stayId, roomId) {
      return occupants
        .filter((o) => o.stay_id === stayId && o.room_id === roomId)
        .map((o) => {
          const p = profileMap.get(o.user_id) || {};
          return {
            id: o.id,
            userId: o.user_id,
            roomId: o.room_id,
            stayId: o.stay_id,
            fullName: p.full_name || 'User',
            email: p.email || '',
            role: p.role || 'student',
            gender: p.gender || null,
            phone: p.phone || null,
            rollNo: p.roll_no || null,
            department: p.department || null,
            assignedBy: o.assigned_by,
            isSelfSelected: !o.assigned_by,
            selectedAt: o.created_at,
          };
        });
    },

    async isUserInRoom(_req, stayId, roomId, userId) {
      return occupants.some((o) => o.stay_id === stayId && o.room_id === roomId && o.user_id === userId);
    },

    async selectRoom(_req, { userId, roomId }) {
      return withLocks([roomId, `user:${userId}`], async () => {
        const room = rooms.get(roomId);
        if (!room) return { ok: false, code: 'ROOM_NOT_FOUND', message: 'Room not found.' };
        const stay = stays.get(room.stay_id);
        const rt = roomTypes.get(room.room_type_id);
        const user = profileMap.get(userId);
        if (!user) return { ok: false, code: 'USER_NOT_FOUND', message: 'User profile not found.' };

        const win = isWindowOpen(stay);
        if (!win.ok) return win;
        if (room.is_locked) return { ok: false, code: 'ROOM_LOCKED', message: 'This room is locked by the administrator.' };

        const elig = checkEligibilityLocal(user, rt, stay);
        if (!elig.ok) return elig;

        const existing = occupants.find((o) => o.stay_id === room.stay_id && o.user_id === userId);
        if (existing) {
          const existingRoom = rooms.get(existing.room_id);
          return {
            ok: false,
            code: 'ALREADY_HAS_ROOM',
            message: `You already hold Room ${existingRoom?.room_no || ''}.`,
            currentRoomId: existing.room_id,
            currentRoomNo: existingRoom?.room_no,
          };
        }

        if (room.occupant_count >= room.capacity) {
          return { ok: false, code: 'ROOM_FULL', message: 'Just taken, pick another.' };
        }

        occupants.push({
          id: nextUuid('99999999-9999-4999-8999'),
          room_id: roomId,
          stay_id: room.stay_id,
          user_id: userId,
          assigned_by: null,
          created_at: new Date().toISOString(),
        });
        room.occupant_count += 1;
        room.version += 1;
        audits.push({ stay_id: room.stay_id, room_id: roomId, user_id: userId, actor_id: userId, action: 'select' });
        return { ok: true, room: { ...room, is_mine: true } };
      });
    },

    async deselectRoom(_req, { userId, roomId }) {
      return withLocks([roomId, `user:${userId}`], async () => {
        const room = rooms.get(roomId);
        if (!room) return { ok: false, code: 'ROOM_NOT_FOUND', message: 'Room not found.' };
        const stay = stays.get(room.stay_id);
        const win = isWindowOpen(stay);
        if (!win.ok) return win;
        if (room.is_locked) return { ok: false, code: 'ROOM_LOCKED', message: 'This room is locked by the administrator.' };

        const idx = occupants.findIndex((o) => o.room_id === roomId && o.user_id === userId);
        if (idx === -1) return { ok: false, code: 'NOT_IN_ROOM', message: 'You are not assigned to this room.' };
        occupants.splice(idx, 1);
        room.occupant_count = Math.max(0, room.occupant_count - 1);
        room.version += 1;
        audits.push({ stay_id: room.stay_id, room_id: roomId, user_id: userId, actor_id: userId, action: 'deselect' });
        return { ok: true, room: { ...room, is_mine: false } };
      });
    },

    async switchRoom(_req, { userId, fromRoomId, toRoomId }) {
      if (fromRoomId === toRoomId) {
        return { ok: false, code: 'SAME_ROOM', message: 'Target room is the same as your current room.' };
      }
      return withLocks([fromRoomId, toRoomId, `user:${userId}`], async () => {
        const fromRoom = rooms.get(fromRoomId);
        const toRoom = rooms.get(toRoomId);
        if (!fromRoom || !toRoom) return { ok: false, code: 'ROOM_NOT_FOUND', message: 'Room not found.' };
        if (fromRoom.stay_id !== toRoom.stay_id) {
          return { ok: false, code: 'STAY_MISMATCH', message: 'Cannot switch across stays.' };
        }
        const stay = stays.get(toRoom.stay_id);
        const win = isWindowOpen(stay);
        if (!win.ok) return win;
        if (fromRoom.is_locked || toRoom.is_locked) {
          return { ok: false, code: 'ROOM_LOCKED', message: 'Room is locked by administrator.' };
        }
        const occ = occupants.find((o) => o.room_id === fromRoomId && o.user_id === userId);
        if (!occ) return { ok: false, code: 'NOT_IN_ROOM', message: 'You are not in the source room.' };

        const user = profileMap.get(userId);
        const rt = roomTypes.get(toRoom.room_type_id);
        const elig = checkEligibilityLocal(user, rt, stay);
        if (!elig.ok) return elig;

        if (toRoom.occupant_count >= toRoom.capacity) {
          return { ok: false, code: 'ROOM_FULL', message: 'Target room is full.' };
        }

        occ.room_id = toRoomId;
        occ.assigned_by = null;
        fromRoom.occupant_count = Math.max(0, fromRoom.occupant_count - 1);
        fromRoom.version += 1;
        toRoom.occupant_count += 1;
        toRoom.version += 1;
        audits.push({
          stay_id: toRoom.stay_id,
          room_id: toRoomId,
          user_id: userId,
          actor_id: userId,
          action: 'switch',
          detail: { from_room_id: fromRoomId, to_room_id: toRoomId },
        });
        return { ok: true, fromRoom: { ...fromRoom }, room: { ...toRoom, is_mine: true } };
      });
    },

    async adminAssign(_req, { adminId, userId, roomId, force = false }) {
      return withLocks([roomId, `user:${userId}`], async () => {
        const room = rooms.get(roomId);
        if (!room) return { ok: false, code: 'ROOM_NOT_FOUND', message: 'Room not found.' };
        if (!profileMap.has(userId)) return { ok: false, code: 'USER_NOT_FOUND', message: 'User not found.' };
        const existing = occupants.find((o) => o.stay_id === room.stay_id && o.user_id === userId);
        if (existing) {
          return { ok: false, code: 'ALREADY_HAS_ROOM', message: 'User already holds a room in this stay.' };
        }
        if (!force && room.occupant_count >= room.capacity) {
          return { ok: false, code: 'ROOM_FULL', message: 'Room is at full capacity.' };
        }
        occupants.push({
          id: nextUuid('99999999-9999-4999-8999'),
          room_id: roomId,
          stay_id: room.stay_id,
          user_id: userId,
          assigned_by: adminId,
          created_at: new Date().toISOString(),
        });
        room.occupant_count += 1;
        if (force && room.occupant_count > room.capacity) room.capacity = room.occupant_count;
        room.version += 1;
        audits.push({ stay_id: room.stay_id, room_id: roomId, user_id: userId, actor_id: adminId, action: 'admin_assign', detail: { force } });
        return { ok: true, room: { ...room } };
      });
    },

    async adminRemove(_req, { adminId, userId, stayId }) {
      const occ = occupants.find((o) => o.stay_id === stayId && o.user_id === userId);
      if (!occ) return { ok: false, code: 'NOT_IN_ROOM', message: 'User does not hold a room in this stay.' };
      return withLocks([occ.room_id, `user:${userId}`], async () => {
        const idx = occupants.findIndex((o) => o.stay_id === stayId && o.user_id === userId);
        if (idx === -1) return { ok: false, code: 'NOT_IN_ROOM', message: 'User not in room.' };
        const room = rooms.get(occupants[idx].room_id);
        occupants.splice(idx, 1);
        if (room) {
          room.occupant_count = Math.max(0, room.occupant_count - 1);
          room.version += 1;
        }
        audits.push({ stay_id: stayId, room_id: room?.id, user_id: userId, actor_id: adminId, action: 'admin_remove' });
        return { ok: true, room: room ? { ...room } : null };
      });
    },

    async adminMove(_req, { adminId, userId, toRoomId, force = false }) {
      const toRoom = rooms.get(toRoomId);
      if (!toRoom) return { ok: false, code: 'ROOM_NOT_FOUND', message: 'Target room not found.' };
      const existing = occupants.find((o) => o.stay_id === toRoom.stay_id && o.user_id === userId);
      if (!existing) return this.adminAssign(_req, { adminId, userId, roomId: toRoomId, force });
      if (existing.room_id === toRoomId) return { ok: false, code: 'SAME_ROOM', message: 'User is already in this room.' };

      return withLocks([existing.room_id, toRoomId, `user:${userId}`], async () => {
        const fromRoom = rooms.get(existing.room_id);
        if (!force && toRoom.occupant_count >= toRoom.capacity) {
          return { ok: false, code: 'ROOM_FULL', message: 'Target room is at full capacity.' };
        }
        existing.room_id = toRoomId;
        existing.assigned_by = adminId;
        if (fromRoom) {
          fromRoom.occupant_count = Math.max(0, fromRoom.occupant_count - 1);
          fromRoom.version += 1;
        }
        toRoom.occupant_count += 1;
        if (force && toRoom.occupant_count > toRoom.capacity) toRoom.capacity = toRoom.occupant_count;
        toRoom.version += 1;
        audits.push({ stay_id: toRoom.stay_id, room_id: toRoomId, user_id: userId, actor_id: adminId, action: 'admin_move', detail: { force } });
        return { ok: true, room: { ...toRoom } };
      });
    },

    async generateLayout(_req, { adminId, stayId, mode, rooms: items }) {
      const stay = stays.get(stayId);
      if (!stay) return { ok: false, code: 'STAY_NOT_FOUND', message: 'Stay not found.' };
      if (mode === 'replace') {
        const occCount = occupants.filter((o) => o.stay_id === stayId).length;
        if (occCount > 0) {
          return {
            ok: false,
            code: 'STAY_HAS_OCCUPANTS',
            message: `Cannot replace layout: ${occCount} person(s) already hold rooms in this stay.`,
            occupantCount: occCount,
          };
        }
        for (const [id, r] of rooms.entries()) {
          if (r.stay_id === stayId) rooms.delete(id);
        }
      }
      const existingNos = new Set(
        Array.from(rooms.values())
          .filter((r) => r.stay_id === stayId)
          .map((r) => r.room_no)
      );
      for (const item of items) {
        if (existingNos.has(item.room_no)) {
          return { ok: false, code: 'DUPLICATE_ROOM_NO', message: `Duplicate room number: ${item.room_no}` };
        }
        existingNos.add(item.room_no);
      }
      for (const item of items) {
        const id = nextUuid('55555555-5555-4555-8555');
        rooms.set(id, {
          id,
          stay_id: stayId,
          room_no: item.room_no,
          floor: item.floor || null,
          capacity: Number(item.capacity),
          room_type_id: item.room_type_id,
          occupant_count: 0,
          is_locked: false,
          version: 0,
        });
      }
      audits.push({ stay_id: stayId, actor_id: adminId, action: 'room_created', detail: { mode, count: items.length } });
      return { ok: true, inserted: items.length, mode };
    },

    async updateRoom(_req, { adminId, roomId, roomNo, floor, capacity, roomTypeId, isLocked }) {
      return withLocks([roomId], async () => {
        const room = rooms.get(roomId);
        if (!room) return { ok: false, code: 'ROOM_NOT_FOUND', message: 'Room not found.' };
        const stay = stays.get(room.stay_id);
        if (capacity !== undefined && capacity !== null) {
          if (capacity < room.occupant_count) {
            const names = occupants
              .filter((o) => o.room_id === roomId)
              .map((o) => profileMap.get(o.user_id)?.full_name || 'Occupant');
            return {
              ok: false,
              code: 'CAPACITY_BELOW_OCCUPANCY',
              message: `Cannot set capacity to ${capacity} while ${room.occupant_count} occupants are in this room (${names.join(', ')}).`,
              occupants: names,
            };
          }
        }
        if (roomTypeId && roomTypeId !== room.room_type_id) {
          const newType = roomTypes.get(roomTypeId);
          if (!newType || newType.stay_id !== room.stay_id) {
            return { ok: false, code: 'INVALID_ROOM_TYPE', message: 'Invalid room type.' };
          }
          const inelig = [];
          for (const o of occupants.filter((occ) => occ.room_id === roomId)) {
            const u = profileMap.get(o.user_id);
            const c = checkEligibilityLocal(u, newType, stay);
            if (!c.ok) inelig.push(u?.full_name || 'Occupant');
          }
          if (inelig.length > 0) {
            return {
              ok: false,
              code: 'INELIGIBLE_CURRENT_OCCUPANTS',
              message: `Cannot change room type; move ineligible occupants first: ${inelig.join(', ')}.`,
              occupants: inelig,
            };
          }
        }
        if (roomNo) room.room_no = roomNo;
        if (floor !== undefined) room.floor = floor || null;
        if (capacity !== undefined && capacity !== null) room.capacity = capacity;
        if (roomTypeId) room.room_type_id = roomTypeId;
        if (isLocked !== undefined && isLocked !== null) room.is_locked = Boolean(isLocked);
        room.version += 1;
        audits.push({ stay_id: room.stay_id, room_id: roomId, actor_id: adminId, action: 'room_updated' });
        return { ok: true, room: { ...room } };
      });
    },

    async deleteRoom(_req, { adminId, roomId, forceUnassign = false }) {
      return withLocks([roomId], async () => {
        const room = rooms.get(roomId);
        if (!room) return { ok: false, code: 'ROOM_NOT_FOUND', message: 'Room not found.' };
        if (room.occupant_count > 0 && !forceUnassign) {
          return {
            ok: false,
            code: 'ROOM_HAS_OCCUPANTS',
            message: `Room ${room.room_no} has ${room.occupant_count} occupant(s).`,
            occupantCount: room.occupant_count,
          };
        }
        for (let i = occupants.length - 1; i >= 0; i--) {
          if (occupants[i].room_id === roomId) occupants.splice(i, 1);
        }
        rooms.delete(roomId);
        audits.push({ stay_id: room.stay_id, room_id: roomId, actor_id: adminId, action: 'room_deleted' });
        return { ok: true, deleted: true, room_no: room.room_no };
      });
    },

    async upsertRoomTypes(_req, { stayId, roomTypes: items }) {
      const stay = stays.get(stayId);
      if (!stay) return { ok: false, code: 'STAY_NOT_FOUND', message: 'Stay not found.' };
      for (const item of items) {
        const existing = Array.from(roomTypes.values()).find(
          (t) => t.stay_id === stayId && (t.id === item.id || t.key === item.key)
        );
        if (existing) {
          existing.label = item.label;
          existing.color_hex = item.colorHex;
          existing.allowed_roles = item.allowedRoles;
          existing.allowed_genders = item.allowedGenders;
        } else {
          const id = nextUuid('88888888-8888-4888-8888');
          roomTypes.set(id, {
            id,
            stay_id: stayId,
            key: item.key,
            label: item.label,
            color_hex: item.colorHex,
            allowed_roles: item.allowedRoles,
            allowed_genders: item.allowedGenders,
          });
        }
      }
      return {
        ok: true,
        roomTypes: Array.from(roomTypes.values()).filter((t) => t.stay_id === stayId),
      };
    },

    async getUnallocated(_req, stayId, { role, gender, q } = {}) {
      const allocated = new Set(occupants.filter((o) => o.stay_id === stayId).map((o) => o.user_id));
      const all = Array.from(profileMap.values());
      let list = all
        .filter((p) => !allocated.has(p.id))
        .map((p) => ({
          id: p.id,
          email: p.email,
          fullName: p.full_name,
          role: p.role,
          gender: p.gender || null,
          phone: p.phone || null,
          rollNo: p.roll_no || null,
          department: p.department || null,
        }));
      if (role) list = list.filter((u) => u.role === role.toLowerCase());
      if (gender) list = list.filter((u) => (gender === 'unset' ? !u.gender : u.gender === gender.toLowerCase()));
      if (q) list = list.filter((u) => `${u.fullName} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
      return {
        totalEligible: all.length,
        allocatedCount: allocated.size,
        unallocatedCount: list.length,
        users: list,
      };
    },

    async getExportData(_req, stayId) {
      const grid = await this.getRoomGrid(null, stayId, null);
      if (!grid) return null;
      return {
        stay: grid.stay,
        rooms: grid.rooms.map((r) => ({
          ...r,
          occupants: occupants
            .filter((o) => o.room_id === r.id)
            .map((o) => ({
              ...o,
              profiles: profileMap.get(o.user_id),
            })),
        })),
      };
    },

    async reconcileCounts(_req, { stayId }) {
      let checked = 0;
      let fixed = 0;
      const diffs = [];
      for (const r of rooms.values()) {
        if (r.stay_id !== stayId) continue;
        checked += 1;
        const actual = occupants.filter((o) => o.room_id === r.id).length;
        if (r.occupant_count !== actual) {
          diffs.push({ room_id: r.id, room_no: r.room_no, was: r.occupant_count, actual });
          r.occupant_count = actual;
          r.version += 1;
          fixed += 1;
        }
      }
      return { ok: true, checked, fixed, diffs };
    },

    async getAudit(_req, stayId) {
      return {
        items: audits.filter((a) => a.stay_id === stayId),
        total: audits.filter((a) => a.stay_id === stayId).length,
        page: 1,
        limit: 50,
      };
    },
  };
}
