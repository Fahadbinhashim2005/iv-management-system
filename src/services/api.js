import { createClient } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const RAILWAY_PROD_URL = 'https://iv-management-system-production.up.railway.app/api';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')
    ? RAILWAY_PROD_URL
    : '/api';

// Helper to get a fresh access token (prevents 1-hour JWT expiry causing 401 wipes)
async function getFreshAuthToken() {
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

// Temporary throwaway client so Admin creating new student accounts NEVER hijacks Admin's active session
function createNonPersistingSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function request(endpoint, options = {}) {
  const token = await getFreshAuthToken();
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

  // Only clear localStorage tokens on 401 if we are NOT actively signed into Supabase Auth
  if (res.status === 401) {
    let hasSupabaseSession = false;
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      hasSupabaseSession = Boolean(data?.session?.user);
    }
    if (!hasSupabaseSession) {
      localStorage.removeItem('iv_auth_token');
      localStorage.removeItem('iv_user');
    }
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.error || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Backend Login Endpoint
  async login(email, password) {
    return await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // Access Request Gateway
  async signInOrRequest(email, password, role, fullName) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = (role || 'student').toLowerCase();

    // 1. Direct Supabase Integration (Live Database)
    if (isSupabaseConfigured && supabase) {
      try {
        // Step A: Safe pre-login status check via RPC (never leaks PII and never blocked by RLS)
        const { data: rpcStatus, error: rpcErr } = await supabase.rpc('get_account_login_status', {
          lookup_email: cleanEmail,
        });

        if (!rpcErr && rpcStatus?.exists) {
          if (rpcStatus.approval_status === 'pending') {
            return { status: 'pending', exists: true, role: rpcStatus.role };
          }
          if (rpcStatus.approval_status === 'rejected') {
            return { status: 'rejected', exists: true, role: rpcStatus.role };
          }
          if (rpcStatus.is_active === false && rpcStatus.role !== 'admin') {
            return { status: 'inactive', exists: true, role: rpcStatus.role };
          }
          return { status: rpcStatus.approval_status || 'approved', exists: true, role: rpcStatus.role };
        }

        // Step B: Fallback if RPC isn't installed yet or account wasn't in RPC:
        // NEVER overwrite existing users! Try signing in FIRST so auth.uid() is populated!
        if (cleanRole === 'admin') {
          return { status: 'approved', exists: true, role: 'admin' };
        }

        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!signInErr && signInData?.user && signInData?.session) {
          // User ALREADY exists and password is valid! Now we have auth.uid(), so RLS allows reading own profile!
          const { data: ownProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', signInData.user.id)
            .maybeSingle();

          const status = ownProfile?.approval_status || 'approved';
          const isActive = ownProfile?.is_active !== false;
          const profileRole = (ownProfile?.role || cleanRole).toLowerCase();

          if (profileRole !== 'admin') {
            if (status === 'pending') {
              await supabase.auth.signOut();
              return { status: 'pending', exists: true, role: profileRole };
            }
            if (status === 'rejected') {
              await supabase.auth.signOut();
              return { status: 'rejected', exists: true, role: profileRole };
            }
            if (!isActive) {
              await supabase.auth.signOut();
              return { status: 'inactive', exists: true, role: profileRole };
            }
          }

          return {
            status: 'approved',
            exists: true,
            role: profileRole,
            alreadyAuthenticated: true,
            session: signInData.session,
            user: signInData.user,
            profile: ownProfile,
          };
        }

        // Handle "Email not confirmed" -> let login() resolve via backend
        if (signInErr?.message?.toLowerCase().includes('email not confirmed')) {
          return { status: 'approved', exists: true, role: cleanRole };
        }

        // Handle user banned by legacy server.js -> pass through to backend / login check
        if (signInErr?.message?.toLowerCase().includes('banned')) {
          return { status: 'pending', exists: true, role: cleanRole };
        }

        // Step C: Only reach here if signInWithPassword failed ("Invalid login credentials")
        // -> Check if genuinely new signup OR existing user with wrong password
        const derivedName =
          fullName?.trim() ||
          cleanEmail
            .split('@')[0]
            .replace(/[._-]+/g, ' ')
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

        const tempClient = createNonPersistingSupabaseClient() || supabase;
        const { data: authData, error: authErr } = await tempClient.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: derivedName, role: cleanRole },
          },
        });

        // If user already existed in Supabase Auth, they typed the wrong password (or are pending)!
        const alreadyRegistered =
          authErr?.message?.toLowerCase().includes('already registered') ||
          authErr?.message?.toLowerCase().includes('already exists') ||
          (authData?.user && Array.isArray(authData.user.identities) && authData.user.identities.length === 0);

        if (alreadyRegistered) {
          return {
            status: 'wrong_password',
            exists: true,
            error: 'An account with this email already exists, or the password is incorrect.',
          };
        }

        if (authErr) {
          throw new Error(authErr.message);
        }

        const userId = authData?.user?.id;
        if (userId) {
          // Insert pending profile ONLY if not already existing (ignoreDuplicates protects existing approvals!)
          await tempClient.from('profiles').upsert(
            {
              id: userId,
              email: cleanEmail,
              full_name: derivedName,
              role: cleanRole,
              approval_status: 'pending',
              is_active: false,
              must_change_password: false,
            },
            { onConflict: 'id', ignoreDuplicates: true }
          );
        }

        return {
          success: true,
          status: 'request_created',
          message: 'Access request submitted! Your account has been sent to the Admin for approval.',
        };
      } catch (err) {
        console.warn('[signInOrRequest Supabase note]:', err.message);
        if (err.message?.toLowerCase().includes('password') || err.message?.toLowerCase().includes('rate limit')) {
          throw err;
        }
      }
    }

    // 2. Try Node Backend API (Railway / localhost)
    try {
      return await request('/auth/sign-in-or-request', {
        method: 'POST',
        body: JSON.stringify({ email, password, role, full_name: fullName }),
      });
    } catch (apiErr) {
      // If Supabase IS configured, never fabricate an offline local request
      if (isSupabaseConfigured) {
        throw apiErr;
      }

      // 3. Client-Side Offline Fallback (ONLY when Supabase is not configured at all)
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

      const derivedName =
        fullName?.trim() ||
        cleanEmail
          .split('@')[0]
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
    if (isSupabaseConfigured && supabase) {
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, role, gender, phone, roll_no, department, batch, is_active, approval_status, created_at')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (role) query = query.eq('role', role.toLowerCase());
      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        // Also merge from backend API only if direct browser query returned 0 (e.g. if Admin is using server fallback token)
        if (data.length > 0) {
          return { success: true, count: data.length, requests: data };
        }
      }

      // Try backend API (which works with server token OR supabaseAdmin)
      try {
        const queryStr = role ? `?role=${encodeURIComponent(role)}` : '';
        const backendRes = await request(`/admin/users/requests${queryStr}`);
        if (backendRes?.requests) {
          return backendRes;
        }
      } catch (e) {
        console.warn('[getAccessRequests Backend fallback note]:', e.message);
      }

      return { success: true, count: (data || []).length, requests: data || [] };
    }

    // Non-Supabase / local dev fallback
    try {
      const query = role ? `?role=${encodeURIComponent(role)}` : '';
      return await request(`/admin/users/requests${query}`);
    } catch {
      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      let pending = offlineUsers.filter((u) => u.approval_status === 'pending');
      if (role) {
        pending = pending.filter((u) => u.role?.toLowerCase() === role.toLowerCase());
      }
      return { success: true, count: pending.length, requests: pending };
    }
  },

  async approveAccessRequest(id, email) {
    if (isSupabaseConfigured && supabase) {
      let q = supabase
        .from('profiles')
        .update({ approval_status: 'approved', is_active: true });

      if (email) {
        q = q.eq('email', email.trim().toLowerCase());
      } else {
        q = q.eq('id', id);
      }

      const { data: updatedRows, error: sbErr } = await q.select();

      // Call backend too (especially to auto-confirm & unban in auth.users if service_role is on server)
      let backendOk = false;
      let backendErr = null;
      try {
        const res = await request(`/admin/users/requests/${id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        backendOk = Boolean(res?.success);
      } catch (e) {
        backendErr = e.message;
      }

      if ((sbErr || !updatedRows || updatedRows.length === 0) && !backendOk) {
        throw new Error(
          sbErr?.message ||
            backendErr ||
            'Could not save approval to Supabase. Make sure you are signed in with a real Supabase Admin account and ran the latest SQL policies.'
        );
      }

      return { success: true, message: 'User approved permanently in database.' };
    }

    // Non-Supabase dev fallback
    try {
      return await request(`/admin/users/requests/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch {
      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      const found = offlineUsers.find(
        (u) => u.id === id || (email && u.email?.toLowerCase() === email.toLowerCase())
      );
      if (found) {
        found.approval_status = 'approved';
        found.is_active = true;
        localStorage.setItem('iv_demo_users', JSON.stringify(offlineUsers));
      }
      return { success: true, message: 'User approved.' };
    }
  },

  async rejectAccessRequest(id, email) {
    if (isSupabaseConfigured && supabase) {
      let q = supabase
        .from('profiles')
        .update({ approval_status: 'rejected', is_active: false });

      if (email) {
        q = q.eq('email', email.trim().toLowerCase());
      } else {
        q = q.eq('id', id);
      }

      const { data: updatedRows, error: sbErr } = await q.select();

      let backendOk = false;
      let backendErr = null;
      try {
        const res = await request(`/admin/users/requests/${id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        backendOk = Boolean(res?.success);
      } catch (e) {
        backendErr = e.message;
      }

      if ((sbErr || !updatedRows || updatedRows.length === 0) && !backendOk) {
        throw new Error(sbErr?.message || backendErr || 'Failed to decline request in database.');
      }

      return { success: true, message: 'User request declined.' };
    }

    try {
      return await request(`/admin/users/requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ email }),
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
    if (isSupabaseConfigured && supabase) {
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, role, gender, phone, roll_no, department, batch, semester, is_active, approval_status, avatar_type, avatar_url, created_at')
        .order('created_at', { ascending: false });

      if (status && status !== 'all') query = query.eq('approval_status', status);
      if (role) query = query.eq('role', role.toLowerCase());

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        return { success: true, count: data.length, users: data };
      }

      // Try Backend API if browser client was blocked or returned empty
      try {
        const params = new URLSearchParams();
        if (role) params.append('role', role);
        if (status) params.append('status', status);
        const queryString = params.toString() ? `?${params.toString()}` : '';
        const backendRes = await request(`/admin/users${queryString}`);
        if (backendRes?.users) {
          return backendRes;
        }
      } catch (e) {
        console.warn('[getAdminUsers Backend note]:', e.message);
      }

      return { success: true, count: (data || []).length, users: data || [] };
    }

    // Pure offline fallback
    try {
      const params = new URLSearchParams();
      if (role) params.append('role', role);
      if (status) params.append('status', status);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      return await request(`/admin/users${queryString}`);
    } catch {
      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      let fallback = offlineUsers.filter((u) => u.approval_status === status);
      if (role) fallback = fallback.filter((u) => u.role?.toLowerCase() === role.toLowerCase());
      return { success: true, count: fallback.length, users: fallback };
    }
  },

  // Read-only Approved Students directory (for Coordinator & Admin)
  async getApprovedStudents() {
    if (isSupabaseConfigured && supabase) {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select(
          'id, email, full_name, role, gender, phone, roll_no, department, batch, semester, is_active, approval_status, guardian_name, guardian_relation, emergency_phone, blood_group, medical_notes, dietary_preference, consent_given, consent_at, avatar_type, avatar_url, avatar_style, avatar_seed, created_at'
        )
        .in('role', ['student', 'coordinator'])
        .eq('approval_status', 'approved')
        .order('full_name', { ascending: true });

      if (!pErr && Array.isArray(profiles)) {
        return { success: true, count: profiles.length, students: profiles };
      }

      try {
        const backendRes = await request('/coordinator/students');
        if (backendRes?.students) return backendRes;
      } catch (e) {
        console.warn('[getApprovedStudents Backend note]:', e.message);
      }

      return { success: true, count: 0, students: [] };
    }

    try {
      return await request('/coordinator/students');
    } catch {
      const offlineUsers = JSON.parse(localStorage.getItem('iv_demo_users') || '[]');
      const fallback = offlineUsers.filter(
        (u) =>
          ['student', 'coordinator'].includes(String(u.role || '').toLowerCase()) &&
          (u.approval_status || 'approved') === 'approved'
      );
      return { success: true, count: fallback.length, students: fallback };
    }
  },

  async createAdminUser(userData) {
    if (isSupabaseConfigured) {
      // Prefer Backend API first (so service_role can create confirmed auth user cleanly)
      try {
        return await request('/admin/users', {
          method: 'POST',
          body: JSON.stringify(userData),
        });
      } catch (backendErr) {
        // Fallback: Use a NON-PERSISTING Supabase client so Admin's own session is NEVER overwritten!
        const tempClient = createNonPersistingSupabaseClient();
        if (!tempClient || !supabase) throw backendErr;

        const email = userData.email.trim().toLowerCase();
        const details = userData.details || {};
        const { data: authData, error: signUpErr } = await tempClient.auth.signUp({
          email,
          password: userData.password,
          options: {
            data: { full_name: userData.full_name, role: userData.role },
          },
        });

        if (signUpErr) throw new Error(signUpErr.message, { cause: backendErr });
        const userId = authData?.user?.id;
        if (!userId) throw new Error('Failed to register user in Supabase Auth.', { cause: backendErr });

        const { error: profErr } = await supabase.from('profiles').upsert({
          id: userId,
          email,
          full_name: userData.full_name,
          role: userData.role,
          gender: userData.gender || null,
          phone: userData.phone || null,
          roll_no: details.roll_no || null,
          department: details.department || 'Computer Science & Engineering',
          batch: details.batch || '2023-27',
          approval_status: 'approved',
          is_active: true,
          must_change_password: false,
        });

        if (profErr) {
          throw new Error(`Created auth user, but profile save failed: ${profErr.message}`, { cause: backendErr });
        }

        return {
          success: true,
          user: { ...userData, id: userId, initial_password: userData.password },
        };
      }
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
    if (isSupabaseConfigured) {
      return await request('/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({ users }),
      });
    }

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
      const { error } = await supabase.from('profiles').update(updates).eq('id', id);
      if (!error) return { success: true };
      return await request(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
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
    return await request(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  async deleteAdminUser(id) {
    if (isSupabaseConfigured) {
      try {
        return await request(`/admin/users/${id}`, { method: 'DELETE' });
      } catch (e) {
        if (supabase) {
          const { error } = await supabase.from('profiles').delete().eq('id', id);
          if (error) throw new Error(error.message, { cause: e });
          return { success: true };
        }
        throw e;
      }
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
