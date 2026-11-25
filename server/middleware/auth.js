import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { db } from '../db.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// True admin privileges exist ONLY when a real SUPABASE_SERVICE_ROLE_KEY is provided
// (anon / sb_publishable_ keys are blocked by RLS and cannot call auth.admin.*)
function isRealServiceRole(key) {
  if (!key || key.length < 20 || key.startsWith('sb_publishable_')) return false;
  if (key.startsWith('sb_secret_')) return true;
  try {
    const parts = key.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      return payload?.role === 'service_role';
    }
  } catch {
    // Non-JWT secret format
  }
  return false;
}

export const hasServiceRoleKey = Boolean(
  supabaseUrl && supabaseUrl.startsWith('http') && isRealServiceRole(serviceRoleKey)
);

export const isSupabaseConfiguredOnServer = Boolean(
  supabaseUrl && supabaseUrl.startsWith('http') && (hasServiceRoleKey || (anonKey && anonKey.length > 20))
);

export const isSupabaseAdminConfigured = hasServiceRoleKey;

// Privileged admin client (bypasses RLS, supports auth.admin.*). Null if only anon key is configured.
export const supabaseAdmin = hasServiceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Public client (respects RLS; safe for signInWithPassword and getUser(jwt))
export const supabasePublic =
  supabaseUrl && supabaseUrl.startsWith('http') && (anonKey || serviceRoleKey)
    ? createClient(supabaseUrl, anonKey || serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

/**
 * Returns a Supabase client appropriate for the request:
 * - supabaseAdmin if true service_role key is configured on Railway
 * - otherwise a user-scoped client carrying the caller's Bearer JWT so Postgres RLS works
 */
export function getSupabaseForRequest(token) {
  if (supabaseAdmin) return supabaseAdmin;
  if (!supabaseUrl || !anonKey) return null;
  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  });
}

// HMAC-signed server session tokens (for fallback/admin login when Supabase Auth isn't used)
const TOKEN_SECRET =
  process.env.JWT_SECRET ||
  serviceRoleKey ||
  anonKey ||
  'iv-connect-server-signing-key';

export function issueServerToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.full_name || user.name || 'User',
    role: String(user.role || 'student').toLowerCase(),
    approval_status: user.approval_status || 'approved',
    is_active: user.is_active !== false,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  return `ivsrv.${encoded}.${sig}`;
}

export function verifyServerToken(token) {
  if (!token || typeof token !== 'string' || !token.startsWith('ivsrv.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * 1) Authentication Middleware: Verifies Supabase JWT or signed server token
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated. Bearer token missing.' });
    }

    // 1. Check signed server token first (e.g. Chief Admin fallback session)
    const serverPayload = verifyServerToken(token);
    if (serverPayload) {
      req.user = {
        id: serverPayload.id,
        email: serverPayload.email,
        name: serverPayload.name,
        role: serverPayload.role,
        approval_status: serverPayload.approval_status,
        must_change_password: false,
        is_active: serverPayload.is_active,
      };
      req.supabase = supabaseAdmin;
      return next();
    }

    // 2. Pure In-Memory Mode (no Supabase env configured)
    if (!isSupabaseConfiguredOnServer) {
      const foundInDb = db.users.find((u) => `token_${u.id}` === token || u.id === token);
      if (!foundInDb) {
        return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      }
      req.user = {
        id: foundInDb.id,
        email: foundInDb.email,
        name: foundInDb.full_name || foundInDb.name || 'User',
        role: String(foundInDb.role || 'student').toLowerCase(),
        approval_status: foundInDb.approval_status || 'approved',
        must_change_password: false,
        is_active: foundInDb.is_active !== false,
      };
      return next();
    }

    // 3. Verify token with Supabase Auth
    const verifier = supabaseAdmin || supabasePublic;
    const { data, error } = await verifier.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    // Attach client (admin client if service_role is available, otherwise user-scoped JWT client)
    const sb = getSupabaseForRequest(token);
    req.supabase = sb;

    // Load user profile from database
    const { data: profile, error: pErr } = await sb
      .from('profiles')
      .select('id, email, full_name, role, is_active, approval_status, must_change_password')
      .eq('id', data.user.id)
      .maybeSingle();

    if (pErr || !profile) {
      const metaRole = data.user.app_metadata?.role;
      if (!metaRole) {
        return res.status(403).json({ error: 'User profile not found or access pending.' });
      }
      req.user = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name || 'User',
        role: String(metaRole).toLowerCase(),
        approval_status: 'approved',
        must_change_password: false,
        is_active: true,
      };
      return next();
    }

    if (String(profile.role).toLowerCase() !== 'admin') {
      if (profile.approval_status === 'pending') {
        return res.status(403).json({ error: 'Your access request is currently pending Admin approval.' });
      }
      if (profile.approval_status === 'rejected') {
        return res.status(403).json({ error: 'Your access request was declined by the administrator.' });
      }
      if (profile.is_active === false) {
        return res.status(403).json({ error: 'Your account has been deactivated.' });
      }
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      name: profile.full_name,
      role: String(profile.role).toLowerCase(),
      approval_status: profile.approval_status || 'approved',
      must_change_password: Boolean(profile.must_change_password),
      is_active: profile.is_active !== false,
    };

    next();
  } catch (err) {
    console.error('[requireAuth Error]:', err);
    return res.status(500).json({ error: 'Authentication internal error.' });
  }
}

/**
 * 2) Authorization Middleware
 */
export const requireRole = (...roles) => {
  const allowed = roles.map((r) => r.toLowerCase());
  return (req, res, next) => {
    const userRole = (req.user?.role || '').toLowerCase();
    if (userRole === 'admin' || allowed.includes(userRole)) {
      return next();
    }
    return res.status(403).json({
      error: `Forbidden. Role '${userRole}' is not authorized to access this resource.`,
    });
  };
};
