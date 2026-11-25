import { supabase, isSupabaseConfigured } from '../../../lib/supabaseClient';

const RAILWAY_PROD_URL = 'https://iv-management-system-production.up.railway.app/api';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')
    ? RAILWAY_PROD_URL
    : '/api';

export const PURPOSE_OPTIONS = [
  { value: 'departure', label: 'Departure roll-call' },
  { value: 'boarding', label: 'Bus boarding' },
  { value: 'hotel_checkin', label: 'Hotel check-in' },
  { value: 'company_entry', label: 'Company entry' },
  { value: 'headcount', label: 'Headcount / break return' },
  { value: 'custom', label: 'Custom' },
];

export const PURPOSE_LABELS = Object.fromEntries(
  PURPOSE_OPTIONS.map((p) => [p.value, p.label])
);

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
      // Fallback to stored token
    }
  }
  return localStorage.getItem('iv_auth_token');
}

/**
 * Attendance API client — NEVER falls back to mock data.
 * Any network failure or non-OK response throws a structured Error.
 */
async function attRequest(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/attendance${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const err = new Error('Attendance server is unreachable or returned an invalid response.');
    err.code = 'NETWORK_ERROR';
    err.status = res.status;
    throw err;
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.ok) {
    const errObj = payload?.error || {};
    const err = new Error(errObj.message || payload?.error || `Request failed (${res.status})`);
    err.code = errObj.code || 'REQUEST_FAILED';
    err.status = res.status;
    throw err;
  }

  return payload.data;
}

export const attendanceApi = {
  // Staff / Admin
  listSessions({ visitId, status } = {}) {
    const params = new URLSearchParams();
    if (visitId) params.set('visitId', visitId);
    if (status) params.set('status', status);
    const qs = params.toString();
    return attRequest(`/sessions${qs ? `?${qs}` : ''}`);
  },

  getSession(sessionId) {
    return attRequest(`/sessions/${sessionId}`);
  },

  createSession(body) {
    return attRequest('/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  updateSession(sessionId, body) {
    return attRequest(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  closeSession(sessionId) {
    return attRequest(`/sessions/${sessionId}/close`, { method: 'POST' });
  },

  reopenSession(sessionId, closesAt = null) {
    return attRequest(`/sessions/${sessionId}/reopen`, {
      method: 'POST',
      body: JSON.stringify(closesAt ? { closesAt } : {}),
    });
  },

  cancelSession(sessionId) {
    return attRequest(`/sessions/${sessionId}/cancel`, { method: 'POST' });
  },

  getSessionQr(sessionId) {
    return attRequest(`/sessions/${sessionId}/qr`);
  },

  getRoster(sessionId, { status = 'all', q = '', group = '' } = {}) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    if (group) params.set('group', group);
    return attRequest(`/sessions/${sessionId}/roster?${params.toString()}`);
  },

  manualMark(sessionId, { studentIds, reason }) {
    return attRequest(`/sessions/${sessionId}/mark`, {
      method: 'POST',
      body: JSON.stringify({ studentIds, reason }),
    });
  },

  manualUnmark(sessionId, studentId, reason) {
    return attRequest(`/sessions/${sessionId}/records/${studentId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  },

  getAudit(sessionId, { page = 1, limit = 50 } = {}) {
    return attRequest(`/sessions/${sessionId}/audit?page=${page}&limit=${limit}`);
  },

  async downloadCsv(sessionId, filename = `attendance-${sessionId}.csv`) {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/attendance/sessions/${sessionId}/export.csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error('Failed to export CSV.');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // Student
  getStudentActive() {
    return attRequest('/student/active');
  },

  scanQr({ token, location }) {
    return attRequest('/scan', {
      method: 'POST',
      body: JSON.stringify(location ? { token, location } : { token }),
    });
  },

  getStudentHistory() {
    return attRequest('/student/history');
  },
};
