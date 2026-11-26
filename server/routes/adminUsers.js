import { Router } from 'express';
import crypto from 'node:crypto';
import {
  supabaseAdmin,
  supabasePublic,
  isSupabaseConfiguredOnServer,
} from '../middleware/auth.js';
import { db } from '../db.js';

const router = Router();

const VALID_GENDERS = ['male', 'female', 'other'];

function normalizeGender(raw) {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  const g = String(raw).trim().toLowerCase();
  if (!VALID_GENDERS.includes(g)) {
    throw new Error("Invalid gender. Must be 'male', 'female', or 'other'.");
  }
  return g;
}

function generateSecurePassword(length = 12) {
  return crypto
    .randomBytes(Math.ceil((length * 3) / 4))
    .toString('base64url')
    .slice(0, length);
}

async function logAdminAction(sb, actorId, action, resourceType, resourceId, details) {
  try {
    if (!sb) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(actorId || ''));
    await sb.from('audit_logs').insert({
      actor_id: isUuid ? actorId : null,
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
    const sb = req.supabase || supabaseAdmin;

    if (!isSupabaseConfiguredOnServer) {
      let pending = db.users.filter((u) => u.approval_status === 'pending');
      if (role) {
        pending = pending.filter((r) => r.role?.toLowerCase() === role.toLowerCase());
      }
      return res.json({ success: true, count: pending.length, requests: pending });
    }

    if (!sb) {
      return res.status(503).json({ error: 'Database client unavailable for pending requests.' });
    }

    let query = sb
      .from('profiles')
      .select('id, email, full_name, role, gender, phone, roll_no, department, batch, is_active, approval_status, created_at')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (role) {
      query = query.eq('role', role.toLowerCase());
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('[GET /api/admin/users/requests DB Error]:', error.message);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, count: (requests || []).length, requests: requests || [] });
  } catch (err) {
    console.error('[GET /api/admin/users/requests Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve pending requests.' });
  }
});

/**
 * POST /api/admin/users/requests/:id/approve
 * Approve a pending student or coordinator access request
 */
router.post('/requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body || {};
    const sb = req.supabase || supabaseAdmin;

    if (!isSupabaseConfiguredOnServer) {
      const memUser = db.users.find((u) => u.id === id || (email && u.email?.toLowerCase() === email.toLowerCase()));
      if (!memUser) return res.status(404).json({ error: 'User request not found.' });
      memUser.approval_status = 'approved';
      memUser.is_active = true;
      return res.json({ success: true, message: 'Account approved successfully.', user: memUser });
    }

    if (!sb) {
      return res.status(403).json({
        error: 'Cannot approve in Supabase: Missing admin Supabase session or SUPABASE_SERVICE_ROLE_KEY.',
      });
    }

    let updateQuery = sb
      .from('profiles')
      .update({
        approval_status: 'approved',
        is_active: true,
      });

    if (id && id.includes('-')) {
      updateQuery = updateQuery.eq('id', id);
    } else if (email) {
      updateQuery = updateQuery.eq('email', email.trim().toLowerCase());
    } else {
      updateQuery = updateQuery.eq('id', id);
    }

    const { data: updatedProfile, error: pErr } = await updateQuery.select().maybeSingle();

    if (pErr) {
      return res.status(500).json({ error: `Database approval error: ${pErr.message}` });
    }
    if (!updatedProfile) {
      return res.status(404).json({
        error: 'Profile could not be updated (check RLS policies or sign in with a Supabase Admin account).',
      });
    }

    // Also ensure Supabase Auth user is email-confirmed and unbanned if service_role is available
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(updatedProfile.id, {
          email_confirm: true,
          ban_duration: 'none',
        });
      } catch (e) {
        console.warn('[Approve Auth Confirm Note]:', e.message);
      }
    }

    await logAdminAction(sb, req.user?.id, 'APPROVE_USER_REQUEST', 'user', updatedProfile.id, {
      email: updatedProfile.email,
      role: updatedProfile.role,
    });

    res.json({
      success: true,
      message: 'Account approved successfully.',
      user: updatedProfile,
    });
  } catch (err) {
    console.error('[Approve User Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to approve request.' });
  }
});

/**
 * POST /api/admin/users/requests/:id/reject
 * Decline/reject an access request
 */
router.post('/requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body || {};
    const sb = req.supabase || supabaseAdmin;

    if (!isSupabaseConfiguredOnServer) {
      const memUser = db.users.find((u) => u.id === id || (email && u.email?.toLowerCase() === email.toLowerCase()));
      if (!memUser) return res.status(404).json({ error: 'User request not found.' });
      memUser.approval_status = 'rejected';
      memUser.is_active = false;
      return res.json({ success: true, message: 'Access request declined.', user: memUser });
    }

    if (!sb) {
      return res.status(403).json({
        error: 'Cannot decline in Supabase: Missing admin Supabase session or SUPABASE_SERVICE_ROLE_KEY.',
      });
    }

    let rejectQuery = sb
      .from('profiles')
      .update({
        approval_status: 'rejected',
        is_active: false,
      });

    if (id && id.includes('-')) {
      rejectQuery = rejectQuery.eq('id', id);
    } else if (email) {
      rejectQuery = rejectQuery.eq('email', email.trim().toLowerCase());
    } else {
      rejectQuery = rejectQuery.eq('id', id);
    }

    const { data: updatedProfile, error: pErr } = await rejectQuery.select().maybeSingle();
    if (pErr) {
      return res.status(500).json({ error: pErr.message });
    }
    if (!updatedProfile) {
      return res.status(404).json({ error: 'Profile could not be found or updated.' });
    }

    await logAdminAction(sb, req.user?.id, 'REJECT_USER_REQUEST', 'user', updatedProfile.id, {
      email: updatedProfile.email,
      role: updatedProfile.role,
    });

    res.json({
      success: true,
      message: 'Access request declined.',
      user: updatedProfile,
    });
  } catch (err) {
    console.error('[Reject User Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to decline request.' });
  }
});

/**
 * GET /api/admin/users
 * List approved users (or all)
 */
router.get('/', async (req, res) => {
  try {
    const { role, status = 'approved' } = req.query;
    const sb = req.supabase || supabaseAdmin;

    if (!isSupabaseConfiguredOnServer) {
      let list = db.users;
      if (status && status !== 'all') {
        list = list.filter((u) => u.approval_status === status);
      }
      if (role) {
        list = list.filter((u) => u.role?.toLowerCase() === role.toLowerCase());
      }
      return res.json({ success: true, count: list.length, users: list });
    }

    if (!sb) {
      return res.status(503).json({ error: 'Database client unavailable.' });
    }

    let query = sb
      .from('profiles')
      .select('id, email, full_name, role, gender, phone, roll_no, department, batch, semester, is_active, approval_status, avatar_type, avatar_url, created_at')
      .order('created_at', { ascending: false });

    if (role && ['student', 'coordinator', 'admin'].includes(role.toLowerCase())) {
      query = query.eq('role', role.toLowerCase());
    }
    if (status && status !== 'all') {
      query = query.eq('approval_status', status.toLowerCase());
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, count: (data || []).length, users: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to retrieve users.' });
  }
});

/**
 * Helper to create one approved user cleanly in Supabase (without hijacking any active session)
 */
async function provisionSupabaseUser(sb, payload) {
  const email = payload.email.trim().toLowerCase();
  const fullName = (payload.full_name || payload.name || email.split('@')[0]).trim();
  const normalizedRole = (payload.role || 'student').toLowerCase();
  const userPassword = payload.password && payload.password.length >= 6 ? payload.password : generateSecurePassword(12);
  const details = payload.details || {};
  const rollNo = details.roll_no || payload.roll_no || null;
  const department = details.department || payload.department || 'Computer Science & Engineering';
  const batch = details.batch || payload.batch || '2023-27';
  const gender = normalizeGender(payload.gender ?? details.gender) ?? null;

  let userId = null;

  if (supabaseAdmin) {
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
      app_metadata: { role: normalizedRole },
      user_metadata: { full_name: fullName, role: normalizedRole },
    });
    if (authErr) throw new Error(authErr.message);
    userId = authData.user.id;
  } else if (supabasePublic) {
    const { data: signUpData, error: signUpErr } = await supabasePublic.auth.signUp({
      email,
      password: userPassword,
      options: {
        data: { full_name: fullName, role: normalizedRole },
      },
    });
    if (signUpErr) throw new Error(signUpErr.message);
    userId = signUpData?.user?.id;
    if (!userId) throw new Error('Account already exists or failed to create.');
  } else {
    throw new Error('Supabase auth client not configured.');
  }

  const { data: savedProfile, error: profErr } = await sb
    .from('profiles')
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      role: normalizedRole,
      gender,
      phone: payload.phone || null,
      roll_no: rollNo,
      department,
      batch,
      approval_status: 'approved',
      is_active: true,
      must_change_password: false,
    })
    .select()
    .maybeSingle();

  if (profErr) {
    throw new Error(`Created auth user, but profile update failed: ${profErr.message}`);
  }

  return {
    ...(savedProfile || { id: userId, email, full_name: fullName, role: normalizedRole }),
    initial_password: userPassword,
  };
}

/**
 * POST /api/admin/users
 * Create a pre-approved user manually
 */
router.post('/', async (req, res) => {
  try {
    const { email, password, full_name, role, phone, gender, details } = req.body;
    const normalizedRole = (role || 'student').toLowerCase();
    const normalizedGender = normalizeGender(gender ?? details?.gender) ?? null;
    const userPassword = password && password.length >= 6 ? password : generateSecurePassword(12);

    if (!isSupabaseConfiguredOnServer) {
      const newUser = {
        id: `usr_${Date.now()}`,
        email: email.trim().toLowerCase(),
        name: full_name.trim(),
        full_name: full_name.trim(),
        role: normalizedRole,
        gender: normalizedGender,
        phone: phone || null,
        roll_no: details?.roll_no || null,
        department: details?.department || 'Computer Science & Engineering',
        approval_status: 'approved',
        is_active: true,
        password: userPassword,
        created_at: new Date().toISOString(),
      };
      db.users.push(newUser);
      return res.status(201).json({
        success: true,
        user: { ...newUser, initial_password: userPassword },
      });
    }

    const sb = req.supabase || supabaseAdmin;
    const created = await provisionSupabaseUser(sb, {
      email,
      password: userPassword,
      full_name,
      role: normalizedRole,
      gender: normalizedGender,
      phone,
      details,
    });

    return res.status(201).json({ success: true, user: created });
  } catch (err) {
    console.error('[POST /api/admin/users Error]:', err);
    res.status(400).json({ error: err.message || 'Failed to provision user.' });
  }
});

/**
 * POST /api/admin/users/bulk
 * Bulk provision pre-approved students from CSV
 */
router.post('/bulk', async (req, res) => {
  try {
    const { users = [] } = req.body || {};
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'No users provided for bulk import.' });
    }

    const sb = req.supabase || supabaseAdmin;
    const createdUsers = [];
    const errors = [];

    for (const row of users) {
      try {
        if (!isSupabaseConfiguredOnServer) {
          const pw = row.temporary_password || generateSecurePassword(12);
          const created = {
            id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            email: row.email.trim().toLowerCase(),
            full_name: row.full_name.trim(),
            roll_no: row.roll_no || null,
            department: row.department || 'Computer Science & Engineering',
            role: 'student',
            approval_status: 'approved',
            is_active: true,
            password: pw,
            temporary_password: pw,
          };
          db.users.push(created);
          createdUsers.push(created);
        } else {
          const pw = row.temporary_password || generateSecurePassword(12);
          const created = await provisionSupabaseUser(sb, {
            ...row,
            password: pw,
            role: 'student',
          });
          createdUsers.push({
            ...created,
            temporary_password: pw,
          });
        }
      } catch (rowErr) {
        errors.push({ email: row.email, error: rowErr.message });
      }
    }

    return res.status(201).json({
      success: true,
      succeededCount: createdUsers.length,
      failedCount: errors.length,
      users: createdUsers,
      errors,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Bulk import failed.' });
  }
});

/**
 * PATCH /api/admin/users/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sb = req.supabase || supabaseAdmin;
    const updates = { ...(req.body || {}) };
    if ('gender' in updates) {
      updates.gender = normalizeGender(updates.gender);
    }

    if (!isSupabaseConfiguredOnServer) {
      const memUser = db.users.find((u) => u.id === id);
      if (memUser) Object.assign(memUser, updates);
      return res.json({ success: true, message: 'User updated successfully.' });
    }

    const { error } = await sb.from('profiles').update(updates).eq('id', id);
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update user.' });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 */
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const newPassword =
      req.body.password && req.body.password.length >= 6 ? req.body.password : generateSecurePassword(12);

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: newPassword });
      if (error) return res.status(400).json({ error: error.message });
    } else if (!isSupabaseConfiguredOnServer) {
      const memUser = db.users.find((u) => u.id === id);
      if (memUser) memUser.password = newPassword;
    } else {
      return res.status(403).json({
        error: 'Password reset requires SUPABASE_SERVICE_ROLE_KEY to be configured on Railway.',
      });
    }

    res.json({
      success: true,
      message: 'Password reset successfully.',
      temporary_password: newPassword,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to reset password.' });
  }
});

/**
 * DELETE /api/admin/users/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sb = req.supabase || supabaseAdmin;

    if (!isSupabaseConfiguredOnServer) {
      const idx = db.users.findIndex((u) => u.id === id);
      if (idx !== -1) db.users.splice(idx, 1);
      return res.json({ success: true, message: 'User deleted successfully.' });
    }

    if (supabaseAdmin) {
      await supabaseAdmin.auth.admin.deleteUser(id);
    }
    const { error } = await sb.from('profiles').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete user.' });
  }
});

export default router;
