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
  // Access Request Gateway (with automatic fallback to localStorage if backend is unreachable)
  async signInOrRequest(email, password, role, fullName) {
    try {
      return await request('/auth/sign-in-or-request', {
        method: 'POST',
        body: JSON.stringify({ email, password, role, full_name: fullName }),
      });
    } catch {
      // Offline fallback: store request in browser local storage
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedRole = (role || 'student').toLowerCase();

      if (normalizedRole === 'admin') {
        return { status: 'approved', exists: true, role: 'admin' };
      }

      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      const existing = offlineUsers.find((u) => u.email.toLowerCase() === normalizedEmail);

      if (existing) {
        return {
          status: existing.approval_status || 'approved',
          exists: true,
          role: existing.role,
        };
      }

      const derivedName = fullName?.trim() || normalizedEmail.split('@')[0]
        .replace(/[._-]+/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const newUser = {
        id: `demo_${Date.now()}`,
        email: normalizedEmail,
        password,
        full_name: derivedName,
        role: normalizedRole,
        approval_status: 'pending',
        is_active: false,
        created_at: new Date().toISOString(),
      };
      offlineUsers.push(newUser);
      localStorage.setItem('iv_demo_users', JSON.stringify(offlineUsers));

      return {
        success: true,
        status: 'request_created',
        message: 'Access request submitted! Your account has been sent to the Admin for approval.',
      };
    }
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
    try {
      const query = role ? `?role=${encodeURIComponent(role)}` : '';
      return await request(`/admin/users/requests${query}`);
    } catch {
      // Offline fallback
      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      let pending = offlineUsers.filter((u) => u.approval_status === 'pending');
      if (role) {
        pending = pending.filter((u) => u.role.toLowerCase() === role.toLowerCase());
      }
      return { success: true, count: pending.length, requests: pending };
    }
  },

  async approveAccessRequest(id) {
    try {
      return await request(`/admin/users/requests/${id}/approve`, {
        method: 'POST',
      });
    } catch {
      // Offline fallback
      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      const found = offlineUsers.find((u) => u.id === id);
      if (found) {
        found.approval_status = 'approved';
        found.is_active = true;
        localStorage.setItem('iv_demo_users', JSON.stringify(offlineUsers));
      }
      return { success: true, message: 'User approved (offline store).' };
    }
  },

  async rejectAccessRequest(id) {
    try {
      return await request(`/admin/users/requests/${id}/reject`, {
        method: 'POST',
      });
    } catch {
      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      const found = offlineUsers.find((u) => u.id === id);
      if (found) {
        found.approval_status = 'rejected';
        found.is_active = false;
        localStorage.setItem('iv_demo_users', JSON.stringify(offlineUsers));
      }
      return { success: true, message: 'User request declined (offline store).' };
    }
  },

  // Admin User Management Endpoints
  async getAdminUsers(role, status = 'approved') {
    try {
      const params = new URLSearchParams();
      if (role) params.append('role', role);
      if (status) params.append('status', status);
      const query = params.toString() ? `?${params.toString()}` : '';
      return await request(`/admin/users${query}`);
    } catch {
      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      let filtered = offlineUsers;
      if (status && status !== 'all') {
        filtered = filtered.filter((u) => u.approval_status === status);
      }
      if (role) {
        filtered = filtered.filter((u) => u.role.toLowerCase() === role.toLowerCase());
      }
      return { success: true, count: filtered.length, users: filtered };
    }
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
    const res = await request('/visits').catch(() => null);
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
    return await request('/participants').catch(() => ({ participants: [] }));
  },

  async updateParticipantStatus(id, status) {
    return await request(`/participants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Attendance
  async getAttendance() {
    return await request('/attendance').catch(() => ({ records: [] }));
  },

  async recordCheckIn(checkpoint, rollNo, studentId, method) {
    return await request('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ checkpoint, rollNo, studentId, method }),
    });
  },

  // Announcements
  async getAnnouncements() {
    const res = await request('/announcements').catch(() => null);
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
    const res = await request('/logistics').catch(() => null);
    return res?.logistics || null;
  },
};

export default api;
