import { Router } from 'express';
import crypto from 'node:crypto';
import { supabaseAdmin } from '../middleware/auth.js';

const router = Router();

function generateSecurePassword(length = 12) {
  return crypto.randomBytes(Math.ceil((length * 3) / 4))
    .toString('base64url')
    .slice(0, length);
}

async function logAdminAction(actorId, action, resourceType, resourceId, details) {
  try {
    if (!supabaseAdmin) return;
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: actorId,
      action,
      resource_type: resourceType,
      resource_id: String(resourceId),
      details,
    });
  } catch (err) {
    console.warn('[Audit Log Note]:', err.message);
  }
}

/**
 * GET /api/admin/users/requests
 * Get all pending access requests awaiting administrator authorization
 */
router.get('/requests', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin is not configured.' });
    }

    const { role } = req.query;

    // Try standard query with approval_status = 'pending'
    const { data: requests, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[requests notice]:', error.message);
      // Fallback: If approval_status column is not yet migrated in Supabase,
      // load profiles where is_active is false or all non-admin profiles
      const { data: allProfiles } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const pending = (allProfiles || []).filter(
        (u) => u.role !== 'admin' && (u.approval_status === 'pending' || u.is_active === false || !u.is_active)
      );

      let filtered = pending;
      if (role) {
        filtered = filtered.filter((r) => r.role?.toLowerCase() === role.toLowerCase());
      }
      return res.json({ success: true, count: filtered.length, requests: filtered });
    }

    let result = requests || [];
    if (role) {
      result = result.filter((r) => r.role?.toLowerCase() === role.toLowerCase());
    }

    res.json({ success: true, count: result.length, requests: result });
  } catch (err) {
    console.error('[GET /api/admin/users/requests Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve access requests.' });
  }
});

/**
 * POST /api/admin/users/requests/:id/approve
 * Approve a pending student or coordinator access request
 */
router.post('/requests/:id/approve', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin is not configured.' });
    }

    const { id } = req.params;

    // 1. Update database profile to approved and active
    let { data: updatedProfile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .update({
        approval_status: 'approved',
        is_active: true,
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (pErr && pErr.message?.includes('column') && pErr.message?.includes('does not exist')) {
      // Fallback if approval_status column does not exist yet in Supabase
      const fallback = await supabaseAdmin
        .from('profiles')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .maybeSingle();
      updatedProfile = fallback.data;
    }

    // 2. Unban in Supabase Auth so they can immediately sign in with their password
    await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: 'none',
    });

    await logAdminAction(req.user?.id, 'APPROVE_USER_REQUEST', 'user', id, {
      email: updatedProfile?.email,
      role: updatedProfile?.role,
    });

    res.json({
      success: true,
      message: `Account approved successfully.`,
      user: updatedProfile || { id },
    });
  } catch (err) {
    console.error('[Approve User Error]:', err);
    res.status(500).json({ error: 'Failed to approve request.' });
  }
});

/**
 * POST /api/admin/users/requests/:id/reject
 * Decline/reject an access request
 */
router.post('/requests/:id/reject', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin is not configured.' });
    }

    const { id } = req.params;

    // 1. Update database profile to rejected and inactive
    let { data: updatedProfile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .update({
        approval_status: 'rejected',
        is_active: false,
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (pErr && pErr.message?.includes('column')) {
      const fallback = await supabaseAdmin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .maybeSingle();
      updatedProfile = fallback.data;
    }

    // 2. Ban in Supabase Auth
    await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: '876000h',
    });

    await logAdminAction(req.user?.id, 'REJECT_USER_REQUEST', 'user', id, {
      email: updatedProfile?.email,
      role: updatedProfile?.role,
    });

    res.json({
      success: true,
      message: `Access request declined.`,
      user: updatedProfile || { id },
    });
  } catch (err) {
    console.error('[Reject User Error]:', err);
    res.status(500).json({ error: 'Failed to decline request.' });
  }
});

/**
 * GET /api/admin/users
 * List approved users (or all), filterable by role and status
 */
router.get('/', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin is not configured.' });
    }

    const { role, status = 'approved' } = req.query;
    let query = supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (role && ['student', 'coordinator', 'admin'].includes(role.toLowerCase())) {
      query = query.eq('role', role.toLowerCase());
    }

    // Try filtering by approval_status
    let profiles = [];
    const { data, error } = await query.eq('approval_status', status.toLowerCase());

    if (error && error.message?.includes('column')) {
      // Fallback if approval_status column does not exist
      const { data: all } = await supabaseAdmin.from('profiles').select('*');
      profiles = all || [];
      if (status === 'approved') {
        profiles = profiles.filter((p) => p.is_active !== false);
      }
    } else {
      profiles = data || [];
    }

    res.json({ success: true, count: profiles.length, users: profiles });
  } catch (err) {
    console.error('[GET /api/admin/users Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

/**
 * POST /api/admin/users
 * Directly provision one student or coordinator
 */
router.post('/', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin is not configured.' });
    }

    const { email, password, full_name, role, phone, details = {} } = req.body;
    const normalizedRole = (role || '').toLowerCase();

    if (!['student', 'coordinator'].includes(normalizedRole)) {
      return res.status(400).json({ error: "Invalid role." });
    }

    if (!email || !full_name) {
      return res.status(400).json({ error: 'Full name and email are required.' });
    }

    const userPassword = password && password.length >= 6 ? password : generateSecurePassword(12);

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: userPassword,
      email_confirm: true,
      app_metadata: { role: normalizedRole },
      user_metadata: { full_name: full_name.trim() },
    });

    if (authErr) {
      return res.status(400).json({ error: authErr.message });
    }

    const userId = authData.user.id;

    // Try inserting into profiles
    const profileInsert = {
      id: userId,
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      role: normalizedRole,
      phone: phone || null,
      approval_status: 'approved',
      is_active: true,
      must_change_password: false,
    };

    let pErr = null;
    const resP = await supabaseAdmin.from('profiles').insert(profileInsert);
    if (resP.error && resP.error.message?.includes('column')) {
      // Fallback without new columns
      await supabaseAdmin.from('profiles').insert({
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: full_name.trim(),
        role: normalizedRole,
      });
    }

    return res.status(201).json({
      success: true,
      user: {
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: full_name.trim(),
        role: normalizedRole,
        initial_password: userPassword,
        approval_status: 'approved',
      },
    });
  } catch (err) {
    console.error('[POST /api/admin/users Error]:', err);
    res.status(500).json({ error: 'Failed to provision user.' });
  }
});

/**
 * PATCH /api/admin/users/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin is not configured.' });
    }

    const { id } = req.params;
    const { is_active, approval_status, full_name, phone } = req.body;

    const profileUpdates = {};
    if (typeof is_active === 'boolean') profileUpdates.is_active = is_active;
    if (approval_status) profileUpdates.approval_status = approval_status;
    if (full_name) profileUpdates.full_name = full_name.trim();
    if (phone !== undefined) profileUpdates.phone = phone;

    if (Object.keys(profileUpdates).length > 0) {
      await supabaseAdmin.from('profiles').update(profileUpdates).eq('id', id);
    }

    if (typeof is_active === 'boolean') {
      await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: is_active ? 'none' : '876000h',
      });
    }

    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 */
router.post('/:id/reset-password', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin is not configured.' });
    }

    const { id } = req.params;
    const newPassword = req.body.password && req.body.password.length >= 6 
      ? req.body.password 
      : generateSecurePassword(12);

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: newPassword,
    });

    if (authErr) {
      return res.status(400).json({ error: authErr.message });
    }

    res.json({
      success: true,
      message: 'Password reset successfully.',
      temporary_password: newPassword,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset user password.' });
  }
});

/**
 * DELETE /api/admin/users/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin is not configured.' });
    }

    const { id } = req.params;
    await supabaseAdmin.auth.admin.deleteUser(id);
    await supabaseAdmin.from('profiles').delete().eq('id', id);

    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

export default router;
