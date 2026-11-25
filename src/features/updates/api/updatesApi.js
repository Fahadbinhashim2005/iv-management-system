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
      // Fallback
    }
  }
  return localStorage.getItem('iv_auth_token');
}

async function updatesRequest(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/announcements${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Updates server returned a non-JSON response.');
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.error?.message || payload?.error || `Request failed (${res.status})`);
  }

  return payload.data;
}

export const updatesApi = {
  getAll() {
    return updatesRequest('');
  },

  broadcast(body) {
    return updatesRequest('', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  togglePin(id, isPinned) {
    return updatesRequest(`/${id}/pin`, {
      method: 'PATCH',
      body: JSON.stringify({ isPinned }),
    });
  },

  remove(id) {
    return updatesRequest(`/${id}`, {
      method: 'DELETE',
    });
  },
};
