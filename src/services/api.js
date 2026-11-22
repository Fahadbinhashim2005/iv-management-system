// Client-side API Service for IV Connect

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

async function request(endpoint, options = {}) {
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

  if (res.status === 401) {
    localStorage.removeItem('iv_auth_token');
    localStorage.removeItem('iv_user');
    console.warn(`[IV Connect API] 401 Unauthorized on ${endpoint}`);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.error || `Request failed with status ${res.status}: ${res.statusText}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Access Request Gateway
  async signInOrRequest(email, password, role, fullName) {
    return await request('/auth/sign-in-or-request', {
      method: 'POST',
      body: JSON.stringify({ email, password, role, full_name: fullName }),
    });
  },

  // Session details
  async getCurrentUser() {
    return await request('/auth/me');
  },

  async notifyPasswordChanged() {
    return await request('/auth/password-changed', { method: 'POST' });
  },

  // Admin Access Request Approvals
  async getAccessRequests(role) {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    return await request(`/admin/users/requests${query}`);
  },

  async approveAccessRequest(id) {
    return await request(`/admin/users/requests/${id}/approve`, {
      method: 'POST',
    });
  },

  async rejectAccessRequest(id) {
    return await request(`/admin/users/requests/${id}/reject`, {
      method: 'POST',
    });
  },

  // Admin User Management Endpoints
  async getAdminUsers(role, status = 'approved') {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return await request(`/admin/users${query}`);
  },

  async createAdminUser(userData) {
    return await request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async bulkCreateAdminUsers(users) {
    return await request('/admin/users/bulk', {
      method: 'POST',
      body: JSON.stringify({ users }),
    });
  },

  async updateAdminUser(id, updates) {
    return await request(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async resetUserPassword(id, password) {
    return await request(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  async deleteAdminUser(id) {
    return await request(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Industrial Visits
  async getVisits() {
    const res = await request('/visits');
    return res?.visits || [];
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
    return res?.announcements || [];
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
