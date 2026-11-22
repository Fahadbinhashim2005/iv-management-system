import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseAdminConfigured = Boolean(
  supabaseUrl && 
  supabaseServiceKey && 
  supabaseUrl.startsWith('http') && 
  supabaseServiceKey.length > 20
);

export const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { 
        autoRefreshToken: false, 
        persistSession: false 
      }
    })
  : null;

/**
 * 1) Authentication Middleware: Verifies the caller's JWT token and approval state
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated. Bearer token missing.' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ 
        error: 'Supabase server admin credentials are not configured in environment variables (SUPABASE_SERVICE_ROLE_KEY).' 
      });
    }

    // Verify token with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    // Load user profile from database to get trusted role and approval status
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, is_active, approval_status, must_change_password')
      .eq('id', data.user.id)
      .single();

    if (pErr || !profile) {
      const metaRole = data.user.app_metadata?.role;
      if (metaRole === 'admin') {
        req.user = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || 'Administrator',
          role: 'admin',
          approval_status: 'approved',
          must_change_password: false,
          is_active: true,
        };
        return next();
      }
      return res.status(403).json({ error: 'Profile not found or access forbidden.' });
    }

    // Check Approval Status
    if (profile.role !== 'admin') {
      if (profile.approval_status === 'pending') {
        return res.status(403).json({ error: 'Your access request is currently pending Admin approval.' });
      }
      if (profile.approval_status === 'rejected') {
        return res.status(403).json({ error: 'Your access request was declined by the administrator.' });
      }
      if (!profile.is_active) {
        return res.status(403).json({ error: 'Your account has been deactivated. Please contact your administrator.' });
      }
    }

    // Attach verified user to request
    req.user = {
      id: profile.id,
      email: profile.email,
      name: profile.full_name,
      role: String(profile.role).toLowerCase(),
      approval_status: profile.approval_status || 'approved',
      must_change_password: Boolean(profile.must_change_password),
      is_active: Boolean(profile.is_active),
    };

    next();
  } catch (err) {
    console.error('[requireAuth Error]:', err);
    return res.status(500).json({ error: 'Authentication internal error.' });
  }
}

/**
 * 2) Authorization Middleware: Checks whether user has one of the required roles
 */
export const requireRole = (...roles) => {
  const allowed = roles.map((r) => r.toLowerCase());
  return (req, res, next) => {
    const userRole = (req.user?.role || '').toLowerCase();
    if (userRole === 'admin' || allowed.includes(userRole)) {
      return next();
    }
    return res.status(403).json({ 
      error: `Forbidden. Role '${userRole}' is not authorized to access this resource.` 
    });
  };
};
