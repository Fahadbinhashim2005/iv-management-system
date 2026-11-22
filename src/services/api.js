import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

async function request(endpoint, options = {}) {
  // If in production without a custom API URL, don't attempt calling local /api (which Vercel rewrites to index.html)
  if (!import.meta.env.VITE_API_URL && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    throw new Error('No custom backend server URL provided.');
  }

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

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('API server returned non-JSON response.');
  }

  if (res.status === 401) {
    localStorage.removeItem('iv_auth_token');
    localStorage.removeItem('iv_user');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.error || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Access Request Gateway
  async signInOrRequest(email, password, role, fullName) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = (role || 'student').toLowerCase();

    // 1. Direct Supabase Integration (Live Database)
    if (isSupabaseConfigured && supabase) {
      try {
        // Check if profile already exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (existingProfile) {
          if (existingProfile.approval_status === 'pending') {
            return { status: 'pending', exists: true, role: existingProfile.role };
          }
          if (existingProfile.approval_status === 'rejected') {
            return { status: 'rejected', exists: true, role: existingProfile.role };
          }
          return { status: 'approved', exists: true, role: existingProfile.role };
        }

        // If not found, this is their first time typing!
        if (cleanRole === 'admin') {
          return { status: 'approved', exists: true, role: 'admin' };
        }

        const derivedName = fullName?.trim() || cleanEmail.split('@')[0]
          .replace(/[._-]+/g, ' ')
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        // Create auth user in Supabase
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: derivedName, role: cleanRole },
          },
        });

        if (authErr && !authErr.message.toLowerCase().includes('already registered')) {
          console.warn('[Supabase SignUp Note]:', authErr.message);
        }

        const userId = authData?.user?.id;
        if (userId) {
          // Insert pending profile
          await supabase.from('profiles').upsert({
            id: userId,
            email: cleanEmail,
            full_name: derivedName,
            role: cleanRole,
            approval_status: 'pending',
            is_active: false,
            must_change_password: false,
          });

          if (cleanRole === 'student') {
            await supabase.from('student_details').upsert({
              profile_id: userId,
              roll_no: `CS-2026-${Math.floor(100 + Math.random() * 900)}`,
              department: 'Computer Science & Engineering',
              batch: 'Batch 2023-27',
            });
          } else if (cleanRole === 'coordinator') {
            await supabase.from('coordinator_details').upsert({
              profile_id: userId,
              department: 'Computer Science & Engineering',
              designation: 'Tour Coordinator',
            });
          }
        }

        // Also broadcast or sync offline store for immediate UI refresh
        const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
        if (!offlineUsers.some((u) => u.email === cleanEmail)) {
          offlineUsers.push({
            id: userId || `usr_${Date.now()}`,
            email: cleanEmail,
            full_name: derivedName,
            role: cleanRole,
            approval_status: 'pending',
            is_active: false,
            created_at: new Date().toISOString(),
          });
          localStorage.setItem('iv_demo_users', JSON.stringify(offlineUsers));
        }

        return {
          success: true,
          status: 'request_created',
          message: 'Access request submitted! Your account has been sent to the Admin for approval.',
        };
      } catch (err) {
        console.warn('[signInOrRequest Supabase error]:', err);
      }
    }

    // 2. Try Node Backend API (if running on Railway / localhost)
    try {
      return await request('/auth/sign-in-or-request', {
        method: 'POST',
        body: JSON.stringify({ email, password, role, full_name: fullName }),
      });
    } catch {
      // 3. Client-Side Offline Fallback
      if (cleanRole === 'admin') {
        return { status: 'approved', exists: true, role: 'admin' };
      }

      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      const existing = offlineUsers.find((u) => u.email.toLowerCase() === cleanEmail);

      if (existing) {
        return {
          status: existing.approval_status || 'approved',
          exists: true,
          role: existing.role,
        };
      }

      const derivedName = fullName?.trim() || cleanEmail.split('@')[0]
        .replace(/[._-]+/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const newUser = {
        id: `demo_${Date.now()}`,
        email: cleanEmail,
        password,
        full_name: derivedName,
        role: cleanRole,
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

  // Admin Access Request Approvals
  async getAccessRequests(role) {
    // 1. Direct Supabase query
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('profiles')
          .select('id, email, full_name, role, phone, is_active, approval_status, created_at')
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false });

        if (role) query = query.eq('role', role.toLowerCase());
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return { success: true, count: data.length, requests: data };
        }
      } catch (e) {
        console.warn('[getAccessRequests Supabase error]:', e);
      }
    }

    // 2. Backend API
    try {
      const query = role ? `?role=${encodeURIComponent(role)}` : '';
      return await request(`/admin/users/requests${query}`);
    } catch {
      // 3. Offline localStorage fallback
      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      let pending = offlineUsers.filter((u) => u.approval_status === 'pending');
      if (role) {
        pending = pending.filter((u) => u.role.toLowerCase() === role.toLowerCase());
      }
      return { success: true, count: pending.length, requests: pending };
    }
  },

  async approveAccessRequest(id) {
    // 1. Direct Supabase update
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ approval_status: 'approved', is_active: true })
          .eq('id', id);

        if (!error) {
          // Also sync offline store
          const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
          const found = offlineUsers.find((u) => u.id === id);
          if (found) {
            found.approval_status = 'approved';
            found.is_active = true;
            localStorage.setItem('iv_demo_users', JSON.stringify(offlineUsers));
          }
          return { success: true, message: 'User approved.' };
        }
      } catch (e) {
        console.warn('[approveAccessRequest Supabase error]:', e);
      }
    }

    // 2. Backend API
    try {
      return await request(`/admin/users/requests/${id}/approve`, {
        method: 'POST',
      });
    } catch {
      // 3. Offline store
      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      const found = offlineUsers.find((u) => u.id === id);
      if (found) {
        found.approval_status = 'approved';
        found.is_active = true;
        localStorage.setItem('iv_demo_users', JSON.stringify(offlineUsers));
      }
      return { success: true, message: 'User approved.' };
    }
  },

  async rejectAccessRequest(id) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ approval_status: 'rejected', is_active: false })
          .eq('id', id);

        if (!error) {
          const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
          const found = offlineUsers.find((u) => u.id === id);
          if (found) {
            found.approval_status = 'rejected';
            found.is_active = false;
            localStorage.setItem('iv_demo_users', JSON.stringify(offlineUsers));
          }
          return { success: true, message: 'User request rejected.' };
        }
      } catch (e) {
        console.warn('[rejectAccessRequest Supabase error]:', e);
      }
    }

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
      return { success: true, message: 'User request declined.' };
    }
  },

  // Admin User Directory
  async getAdminUsers(role, status = 'approved') {
    // 1. Direct Supabase query
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('profiles')
          .select('id, email, full_name, role, phone, is_active, approval_status, created_at')
          .order('created_at', { ascending: false });

        if (status && status !== 'all') query = query.eq('approval_status', status);
        if (role) query = query.eq('role', role.toLowerCase());

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return { success: true, count: data.length, users: data };
        }
      } catch (e) {
        console.warn('[getAdminUsers Supabase error]:', e);
      }
    }

    // 2. Backend API
    try {
      const params = new URLSearchParams();
      if (role) params.append('role', role);
      if (status) params.append('status', status);
      const query = params.toString() ? `?${params.toString()}` : '';
      return await request(`/admin/users${query}`);
    } catch {
      // 3. Offline store
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
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData } = await supabase.auth.signUp({
          email: userData.email.trim().toLowerCase(),
          password: userData.password,
          options: {
            data: { full_name: userData.full_name, role: userData.role },
          },
        });

        if (authData?.user) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            email: userData.email.trim().toLowerCase(),
            full_name: userData.full_name,
            role: userData.role,
            approval_status: 'approved',
            is_active: true,
            must_change_password: false,
          });

          return { success: true, user: { ...userData, id: authData.user.id } };
        }
      } catch (e) {}
    }

    try {
      return await request('/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    } catch {
      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      const newUser = {
        id: `demo_${Date.now()}`,
        ...userData,
        approval_status: 'approved',
        is_active: true,
      };
      offlineUsers.push(newUser);
      localStorage.setItem('iv_demo_users', JSON.stringify(offlineUsers));
      return { success: true, user: newUser };
    }
  },

  async bulkCreateAdminUsers(users) {
    try {
      return await request('/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({ users }),
      });
    } catch {
      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      const added = [];
      for (const u of users) {
        const created = {
          id: `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          email: u.email,
          full_name: u.full_name,
          role: u.role || 'student',
          approval_status: 'approved',
          is_active: true,
          temporary_password: u.temporary_password || 'Password123!',
        };
        offlineUsers.push(created);
        added.push(created);
      }
      localStorage.setItem('iv_demo_users', JSON.stringify(offlineUsers));
      return { success: true, succeededCount: added.length, users: added };
    }
  },

  async updateAdminUser(id, updates) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('profiles').update(updates).eq('id', id);
        if (!error) return { success: true };
      } catch (e) {}
    }

    try {
      return await request(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    } catch {
      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      const found = offlineUsers.find((u) => u.id === id);
      if (found) {
        Object.assign(found, updates);
        localStorage.setItem('iv_demo_users', JSON.stringify(offlineUsers));
      }
      return { success: true };
    }
  },

  async resetUserPassword(id, password) {
    try {
      return await request(`/admin/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
    } catch {
      return { success: true, temporary_password: password };
    }
  },

  async deleteAdminUser(id) {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').delete().eq('id', id);
      } catch (e) {}
    }

    try {
      return await request(`/admin/users/${id}`, { method: 'DELETE' });
    } catch {
      let offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      offlineUsers = offlineUsers.filter((u) => u.id !== id);
      localStorage.setItem('iv_demo_users', JSON.stringify(offlineUsers));
      return { success: true };
    }
  },

  // Operational items
  async getVisits() {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('industrial_visits').select('*');
      if (data && data.length > 0) return data;
    }
    const res = await request('/visits').catch(() => null);
    return res?.visits || [];
  },

  async createVisit(visitData) {
    return await request('/visits', {
      method: 'POST',
      body: JSON.stringify(visitData),
    });
  },

  async getParticipants() {
    return await request('/participants').catch(() => ({ participants: [] }));
  },

  async updateParticipantStatus(id, status) {
    return await request(`/participants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async getAttendance() {
    return await request('/attendance').catch(() => ({ records: [] }));
  },

  async recordCheckIn(checkpoint, rollNo, studentId, method) {
    return await request('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ checkpoint, rollNo, studentId, method }),
    });
  },

  async getAnnouncements() {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('announcements').select('*');
      if (data && data.length > 0) return data;
    }
    const res = await request('/announcements').catch(() => null);
    return res?.announcements || [];
  },

  async broadcastAnnouncement(announcement) {
    return await request('/announcements', {
      method: 'POST',
      body: JSON.stringify(announcement),
    });
  },

  async getLogistics() {
    const res = await request('/logistics').catch(() => null);
    return res?.logistics || null;
  },
};

export default api;
