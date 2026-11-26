import { supabase, isSupabaseConfigured } from '../../../lib/supabaseClient';

const RAILWAY_PROD_URL = 'https://iv-management-system-production.up.railway.app/api';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')
    ? RAILWAY_PROD_URL
    : '/api';

async function getToken() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const liveToken = data?.session?.access_token;
      if (liveToken) {
        localStorage.setItem('iv_auth_token', liveToken);
        return liveToken;
      }
    } catch {
      // Fallback to localStorage token
    }
  }
  return localStorage.getItem('iv_auth_token');
}

function makeRequestId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function roomRequest(path, options = {}, { retryOnBusy = false } = {}) {
  const token = await getToken();
  const requestId = options.requestId || (retryOnBusy ? makeRequestId() : undefined);

  const doFetch = async () => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(requestId ? { 'X-Request-Id': requestId } : {}),
        ...options.headers,
      },
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const err = new Error('Room allocation server is unreachable.');
      err.code = 'NETWORK_ERROR';
      err.status = res.status;
      err.retryable = true;
      throw err;
    }

    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.ok) {
      const errObj = payload?.error || {};
      const err = new Error(errObj.message || payload?.error || `Request failed (${res.status})`);
      err.code = errObj.code || 'REQUEST_FAILED';
      err.status = res.status;
      err.currentRoomId = errObj.currentRoomId;
      err.currentRoomNo = errObj.currentRoomNo;
      err.occupants = errObj.occupants;
      err.occupantCount = errObj.occupantCount;
      err.retryable = err.code === 'BUSY_RETRY' || res.status >= 502;
      throw err;
    }

    return payload.data;
  };

  try {
    return await doFetch();
  } catch (err) {
    const isNetwork = err.name === 'TypeError' || err.code === 'NETWORK_ERROR';
    if (retryOnBusy && (err.retryable || isNetwork)) {
      // One automatic retry after 300-800ms with jitter using the same X-Request-Id
      await sleep(300 + Math.floor(Math.random() * 500));
      return await doFetch();
    }
    throw err;
  }
}

export const roomsApi = {
  // Stays
  listStays() {
    return roomRequest('/stays');
  },

  getStay(stayId) {
    return roomRequest(`/stays/${stayId}`);
  },

  createStay(body) {
    return roomRequest('/stays', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  updateStay(stayId, body) {
    return roomRequest(`/stays/${stayId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  // Grid & Self
  getGrid(stayId) {
    return roomRequest(`/stays/${stayId}/rooms`);
  },

  getMe(stayId) {
    return roomRequest(`/stays/${stayId}/me`);
  },

  getOccupants(stayId, roomId) {
    return roomRequest(`/stays/${stayId}/rooms/${roomId}/occupants`);
  },

  // Atomic selection actions (with X-Request-Id & single retry on BUSY_RETRY / network drop)
  selectRoom(stayId, roomId) {
    return roomRequest(
      `/stays/${stayId}/rooms/${roomId}/select`,
      { method: 'POST' },
      { retryOnBusy: true }
    );
  },

  deselectRoom(stayId, roomId) {
    return roomRequest(
      `/stays/${stayId}/rooms/${roomId}/select`,
      { method: 'DELETE' },
      { retryOnBusy: true }
    );
  },

  switchRoom(stayId, fromRoomId, toRoomId) {
    return roomRequest(
      `/stays/${stayId}/rooms/switch`,
      {
        method: 'POST',
        body: JSON.stringify({ fromRoomId, toRoomId }),
      },
      { retryOnBusy: true }
    );
  },

  // Admin: Room Types & Layout Generator & CRUD
  upsertRoomTypes(stayId, roomTypes) {
    return roomRequest(`/stays/${stayId}/room-types`, {
      method: 'PUT',
      body: JSON.stringify({ roomTypes }),
    });
  },

  generateLayout(stayId, { mode = 'add', rooms }) {
    return roomRequest(`/stays/${stayId}/layout/generate`, {
      method: 'POST',
      body: JSON.stringify({ mode, rooms }),
    });
  },

  createRoom(stayId, body) {
    return roomRequest(`/stays/${stayId}/rooms`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  updateRoom(roomId, body) {
    return roomRequest(`/rooms/${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  bulkUpdateRooms(stayId, body) {
    return roomRequest(`/stays/${stayId}/rooms/bulk-update`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  deleteRoom(roomId, forceUnassign = false) {
    return roomRequest(`/rooms/${roomId}${forceUnassign ? '?force=true' : ''}`, {
      method: 'DELETE',
    });
  },

  // Admin Overrides
  adminAssign({ userId, roomId, force = false }) {
    return roomRequest('/admin/rooms/assign', {
      method: 'POST',
      body: JSON.stringify({ userId, roomId, force }),
    });
  },

  adminRemove({ userId, stayId }) {
    return roomRequest('/admin/rooms/remove', {
      method: 'POST',
      body: JSON.stringify({ userId, stayId }),
    });
  },

  adminMove({ userId, toRoomId, force = false }) {
    return roomRequest('/admin/rooms/move', {
      method: 'POST',
      body: JSON.stringify({ userId, toRoomId, force }),
    });
  },

  // Staff: Unallocated, Reconcile, Audit, CSV
  getUnallocated(stayId, { role = '', gender = '', q = '' } = {}) {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (gender) params.set('gender', gender);
    if (q) params.set('q', q);
    const qs = params.toString();
    return roomRequest(`/stays/${stayId}/unallocated${qs ? `?${qs}` : ''}`);
  },

  reconcileCounts(stayId) {
    return roomRequest(`/stays/${stayId}/reconcile`, { method: 'POST' });
  },

  getAudit(stayId, { page = 1, limit = 50 } = {}) {
    return roomRequest(`/stays/${stayId}/audit?page=${page}&limit=${limit}`);
  },

  async downloadCsv(stayId, stayName = 'stay') {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/stays/${stayId}/export.csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error('Failed to export rooms CSV.');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = String(stayName).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `rooms-${slug || stayId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
