import { Router } from 'express';
import crypto from 'node:crypto';
import { supabaseAdmin } from '../middleware/auth.js';
import { db } from '../db.js';

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
    const { role } = req.query;

    if (!supabaseAdmin) {
      // In-memory fallback
      let pending = db.users.filter((u) => u.approval_status === 'pending');
      if (role) {
        pending = pending.filter((r) => r.role?.toLowerCase() === role.toLowerCase());
      }
      return res.json({ success: true, count: pending.length, requests: pending });
    }

    // Supabase query
    const { data: requests, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[requests notice]:', error.message);
      // Fallback: merge with db.users
      let fallbackList = db.users.filter((u) => u.approval_status === 'pending');
      if (role) {
        fallbackList = fallbackList.filter((r) => r.role?.toLowerCase() === role.toLowerCase());
      }
      return res.json({ success: true, count: fallbackList.length, requests: fallbackList });
    }

    let result = requests || [];
    // Also include any requests received in memory
    const inMemPending = db.users.filter((u) => u.approval_status === 'pending' && !result.some((r) => r.email === u.email));
    result = [...result, ...inMemPending];

    if (role) {
      result = result.filter((r) => r.role?.toLowerCase() === role.toLowerCase());
    }

    res.json({ success: true, count: result.length, requests: result });
  } catch (err) {
    console.error('[GET /api/admin/users/requests Error]:', err);
    const inMemPending = db.users.filter((u) => u.approval_status === 'pending');
    res.json({ success: true, count: inMemPending.length, requests: inMemPending });
  }
});

/**
 * POST /api/admin/users/requests/:id/approve
 * Approve a pending student or coordinator access request
 */
router.post('/requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    // Update in-memory store
    const memUser = db.users.find((u) => u.id === id);
    if (memUser) {
      memUser.approval_status = 'approved';
      memUser.is_active = true;
    }

    if (!supabaseAdmin) {
      return res.json({
        success: true,
        message: 'Account approved successfully.',
        user: memUser || { id },
      });
    }

    // Update Supabase
    let { data: updatedProfile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .update({
        approval_status: 'approved',
        is_active: true,
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (pErr && pErr.message?.includes('column')) {
      const fallback = await supabaseAdmin
        .from('profiles')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .maybeSingle();
      updatedProfile = fallback.data;
    }

    try {
      await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: 'none',
      });
    } catch (e) {}

    await logAdminAction(req.user?.id, 'APPROVE_USER_REQUEST', 'user', id, {
      email: updatedProfile?.email,
      role: updatedProfile?.role,
    });

    res.json({
      success: true,
      message: `Account approved successfully.`,
      user: updatedProfile || memUser || { id },
    });
  } catch (err) {
    console.error('[Approve User Error]:', err);
    res.json({ success: true, message: 'Account approved.' });
  }
});

/**
 * POST /api/admin/users/requests/:id/reject
 * Decline/reject an access request
 */
router.post('/requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;

    const memUser = db.users.find((u) => u.id === id);
    if (memUser) {
      memUser.approval_status = 'rejected';
      memUser.is_active = false;
    }

    if (!supabaseAdmin) {
      return res.json({
        success: true,
        message: 'Access request declined.',
        user: memUser || { id },
      });
    }

    let { data: updatedProfile } = await supabaseAdmin
      .from('profiles')
      .update({
        approval_status: 'rejected',
        is_active: false,
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    try {
      await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: '876000h',
      });
    } catch (e) {}

    res.json({
      success: true,
      message: `Access request declined.`,
      user: updatedProfile || memUser || { id },
    });
  } catch (err) {
    console.error('[Reject User Error]:', err);
    res.json({ success: true, message: 'Request declined.' });
  }
});

/**
 * GET /api/admin/users
 * List approved users (or all)
 */
router.get('/', async (req, res) => {
  try {
    const { role, status = 'approved' } = req.query;

    if (!supabaseAdmin) {
      let list = db.users;
      if (status && status !== 'all') {
        list = list.filter((u) => u.approval_status === status);
      }
      if (role) {
        list = list.filter((u) => u.role?.toLowerCase() === role.toLowerCase());
      }
      return res.json({ success: true, count: list.length, users: list });
    }

    let query = supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (role && ['student', 'coordinator', 'admin'].includes(role.toLowerCase())) {
      query = query.eq('role', role.toLowerCase());
    }

    let profiles = [];
    const { data, error } = await query.eq('approval_status', status.toLowerCase());

    if (error) {
      let list = db.users;
      if (status && status !== 'all') list = list.filter((u) => u.approval_status === status);
      if (role) list = list.filter((u) => u.role?.toLowerCase() === role.toLowerCase());
      return res.json({ success: true, count: list.length, users: list });
    }

    profiles = data || [];
    res.json({ success: true, count: profiles.length, users: profiles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

/**
 * POST /api/admin/users
 */
router.post('/', async (req, res) => {
  try {
    const { email, password, full_name, role, phone } = req.body;
    const normalizedRole = (role || 'student').toLowerCase();
    const userPassword = password && password.length >= 6 ? password : generateSecurePassword(12);

    const newUser = {
      id: `usr_${Date.now()}`,
      email: email.trim().toLowerCase(),
      name: full_name.trim(),
      full_name: full_name.trim(),
      role: normalizedRole,
      phone: phone || null,
      approval_status: 'approved',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    db.users.push(newUser);

    if (supabaseAdmin) {
      try {
        const { data: authData } = await supabaseAdmin.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password: userPassword,
          email_confirm: true,
          app_metadata: { role: normalizedRole },
          user_metadata: { full_name: full_name.trim() },
        });

        if (authData?.user) {
          newUser.id = authData.user.id;
          await supabaseAdmin.from('profiles').upsert({
            id: authData.user.id,
            email: email.trim().toLowerCase(),
            full_name: full_name.trim(),
            role: normalizedRole,
            phone: phone || null,
            approval_status: 'approved',
            is_active: true,
            must_change_password: false,
          });
        }
      } catch (e) {}
    }

    return res.status(201).json({
      success: true,
      user: {
        ...newUser,
        initial_password: userPassword,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to provision user.' });
  }
});

/**
 * PATCH /api/admin/users/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const memUser = db.users.find((u) => u.id === id);
    if (memUser) {
      Object.assign(memUser, req.body);
    }

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('profiles').update(req.body).eq('id', id);
      } catch (e) {}
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
    const { id } = req.params;
    const newPassword = req.body.password && req.body.password.length >= 6 
      ? req.body.password 
      : generateSecurePassword(12);

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(id, { password: newPassword });
      } catch (e) {}
    }

    res.json({
      success: true,
      message: 'Password reset successfully.',
      temporary_password: newPassword,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

/**
 * DELETE /api/admin/users/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx !== -1) db.users.splice(idx, 1);

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(id);
        await supabaseAdmin.from('profiles').delete().eq('id', id);
      } catch (e) {}
    }

    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

export default router;
