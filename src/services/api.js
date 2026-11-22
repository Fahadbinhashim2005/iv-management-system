// Client-side API Service for IV Connect

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

async function request(endpoint, options = {}) {
  try {
    const token = localStorage.getItem('iv_auth_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`[IV Connect API Client] Falling back to local offline mock: ${endpoint}`, err);
    return null;
  }
}

export const api = {
  // Authentication
  async login(email, password, role) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });

    if (res?.token) {
      localStorage.setItem('iv_auth_token', res.token);
      localStorage.setItem('iv_user', JSON.stringify(res.user));
    }

    return res;
  },

  async getCurrentUser() {
    const res = await request('/auth/me');
    if (res?.user) return res.user;

    const stored = localStorage.getItem('iv_user');
    return stored ? JSON.parse(stored) : null;
  },

  logout() {
    localStorage.removeItem('iv_auth_token');
    localStorage.removeItem('iv_user');
  },

  // Visits
  async getVisits() {
    const res = await request('/visits');
    return res?.visits || null;
  },

  async createVisit(visitData) {
    return await request('/visits', {
      method: 'POST',
      body: JSON.stringify(visitData),
    });
  },

  // Participants
  async getParticipants() {
    return await request('/participants');
  },

  async updateParticipantStatus(id, status) {
    return await request(`/participants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Attendance
  async getAttendance() {
    return await request('/attendance');
  },

  async recordCheckIn(checkpoint, rollNo, studentId, method) {
    return await request('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ checkpoint, rollNo, studentId, method }),
    });
  },

  // Announcements
  async getAnnouncements() {
    const res = await request('/announcements');
    return res?.announcements || null;
  },

  async broadcastAnnouncement(announcement) {
    return await request('/announcements', {
      method: 'POST',
      body: JSON.stringify(announcement),
    });
  },

  // Logistics
  async getLogistics() {
    const res = await request('/logistics');
    return res?.logistics || null;
  },
};

export default api;
