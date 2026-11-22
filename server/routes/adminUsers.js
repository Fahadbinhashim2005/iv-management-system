import { Router } from 'express';
import crypto from 'node:crypto';
import { supabaseAdmin } from '../middleware/auth.js';

const router = Router();

// Helper to generate a secure random password
function generateSecurePassword(length = 12) {
  return crypto.randomBytes(Math.ceil((length * 3) / 4))
    .toString('base64url')
    .slice(0, length);
}

// Helper to record an audit log
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
    console.warn('[Audit Log Error]: Failed to write audit log:', err.message);
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
    let query = supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, phone, is_active, approval_status, created_at')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (role && ['student', 'coordinator'].includes(role.toLowerCase())) {
      query = query.eq('role', role.toLowerCase());
    }

    const { data: requests, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, count: requests.length, requests });
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
    const { data: updatedProfile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .update({
        approval_status: 'approved',
        is_active: true,
      })
      .eq('id', id)
      .select()
      .single();

    if (pErr) {
      return res.status(400).json({ error: pErr.message });
    }

    // 2. Unban in Supabase Auth so they can immediately sign in with their password
    await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: 'none',
    });

    await logAdminAction(req.user.id, 'APPROVE_USER_REQUEST', 'user', id, {
      email: updatedProfile.email,
      role: updatedProfile.role,
    });

    res.json({
      success: true,
      message: `Account for ${updatedProfile.full_name} (${updatedProfile.email}) approved successfully.`,
      user: updatedProfile,
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
    const { data: updatedProfile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .update({
        approval_status: 'rejected',
        is_active: false,
      })
      .eq('id', id)
      .select()
      .single();

    if (pErr) {
      return res.status(400).json({ error: pErr.message });
    }

    // 2. Ban in Supabase Auth
    await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: '876000h',
    });

    await logAdminAction(req.user.id, 'REJECT_USER_REQUEST', 'user', id, {
      email: updatedProfile.email,
      role: updatedProfile.role,
    });

    res.json({
      success: true,
      message: `Access request for ${updatedProfile.email} declined.`,
      user: updatedProfile,
    });
  } catch (err) {
    console.error('[Reject User Error]:', err);
    res.status(500).json({ error: 'Failed to decline request.' });
  }
});

/**
 * GET /api/admin/users
 * List approved users (or all), filterable by role (?role=student or ?role=coordinator) and status
 */
router.get('/', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin is not configured.' });
    }

    const { role, status = 'approved' } = req.query;
    let query = supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, phone, is_active, approval_status, must_change_password, created_at')
      .order('created_at', { ascending: false });

    if (role && ['student', 'coordinator', 'admin'].includes(role.toLowerCase())) {
      query = query.eq('role', role.toLowerCase());
    }

    if (status && status !== 'all') {
      query = query.eq('approval_status', status.toLowerCase());
    }

    const { data: profiles, error: pErr } = await query;
    if (pErr) {
      return res.status(400).json({ error: pErr.message });
    }

    // Fetch related details
    const userIds = profiles.map((p) => p.id);
    let studentDetailsMap = {};
    let coordinatorDetailsMap = {};

    if (userIds.length > 0) {
      const [{ data: sDetails }, { data: cDetails }] = await Promise.all([
        supabaseAdmin.from('student_details').select('*').in('profile_id', userIds),
        supabaseAdmin.from('coordinator_details').select('*').in('profile_id', userIds),
      ]);

      (sDetails || []).forEach((d) => { studentDetailsMap[d.profile_id] = d; });
      (cDetails || []).forEach((d) => { coordinatorDetailsMap[d.profile_id] = d; });
    }

    const enriched = profiles.map((p) => ({
      ...p,
      student_details: studentDetailsMap[p.id] || null,
      coordinator_details: coordinatorDetailsMap[p.id] || null,
      details: studentDetailsMap[p.id] || coordinatorDetailsMap[p.id] || {},
    }));

    res.json({ success: true, count: enriched.length, users: enriched });
  } catch (err) {
    console.error('[GET /api/admin/users Error]:', err);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

/**
 * POST /api/admin/users
 * Directly provision one student or coordinator (Auto-approved by admin)
 */
router.post('/', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin is not configured.' });
    }

    const { email, password, full_name, role, phone, details = {} } = req.body;
    const normalizedRole = (role || '').toLowerCase();

    if (!['student', 'coordinator'].includes(normalizedRole)) {
      return res.status(400).json({ error: "Invalid role. Only 'student' or 'coordinator' accounts can be provisioned." });
    }

    if (!email || !full_name) {
      return res.status(400).json({ error: 'Full name and email are required.' });
    }

    const userPassword = password && password.length >= 8 ? password : generateSecurePassword(12);

    // 1. Create auth user in Supabase Auth
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

    // 2. Insert into public.profiles (pre-approved)
    const { error: pErr } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      role: normalizedRole,
      phone: phone || null,
      approval_status: 'approved',
      is_active: true,
      must_change_password: false,
      created_by: req.user.id,
    });

    // 3. Insert into detail table
    let dErr = null;
    if (!pErr) {
      if (normalizedRole === 'student') {
        const { error } = await supabaseAdmin.from('student_details').insert({
          profile_id: userId,
          roll_no: details.roll_no || details.roll || `STU-${Date.now().toString().slice(-4)}`,
          department: details.department || '',
          batch: details.batch || '',
          bus_no: details.bus_no || details.bus || null,
          seat_no: details.seat_no || details.seat || null,
          room_no: details.room_no || details.room || null,
        });
        dErr = error;
      } else if (normalizedRole === 'coordinator') {
        const { error } = await supabaseAdmin.from('coordinator_details').insert({
          profile_id: userId,
          department: details.department || '',
          designation: details.designation || 'Tour Coordinator',
        });
        dErr = error;
      }
    }

    if (pErr || dErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: (pErr || dErr).message });
    }

    await logAdminAction(req.user.id, 'CREATE_USER', 'user', userId, {
      email,
      role: normalizedRole,
      full_name,
    });

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
 * POST /api/admin/users/bulk
 * Bulk import students from CSV rows (Auto-approved by admin)
 */
router.post('/bulk', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin is not configured.' });
    }

    const rawUsers = req.body.users || req.body.rows || [];
    if (!Array.isArray(rawUsers) || rawUsers.length === 0) {
      return res.status(400).json({ error: 'An array of users is required.' });
    }

    const succeeded = [];
    const failed = [];

    for (const item of rawUsers) {
      const email = (item.email || '').trim().toLowerCase();
      const fullName = (item.full_name || item.name || '').trim();
      const rollNo = (item.roll_no || item.roll || '').trim();
      const department = (item.department || '').trim();
      const batch = (item.batch || '').trim();
      const phone = (item.phone || '').trim();
      const role = (item.role || 'student').toLowerCase();
      const password = item.password && item.password.length >= 8 ? item.password : generateSecurePassword(12);

      if (!email || !fullName) {
        failed.push({ email, name: fullName, error: 'Email and full name are required.' });
        continue;
      }

      try {
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: { role },
          user_metadata: { full_name: fullName },
        });

        if (authErr) {
          failed.push({ email, name: fullName, error: authErr.message });
          continue;
        }

        const userId = authData.user.id;

        const { error: pErr } = await supabaseAdmin.from('profiles').insert({
          id: userId,
          email,
          full_name: fullName,
          role,
          phone: phone || null,
          approval_status: 'approved',
          is_active: true,
          must_change_password: false,
          created_by: req.user.id,
        });

        let dErr = null;
        if (!pErr) {
          const { error } = await supabaseAdmin.from('student_details').insert({
            profile_id: userId,
            roll_no: rollNo || `STU-${Date.now().toString().slice(-4)}`,
            department,
            batch,
          });
          dErr = error;
        }

        if (pErr || dErr) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
          failed.push({ email, name: fullName, error: (pErr || dErr).message });
          continue;
        }

        succeeded.push({
          id: userId,
          email,
          full_name: fullName,
          roll_no: rollNo,
          department,
          batch,
          phone,
          role,
          temporary_password: password,
        });
      } catch (rowErr) {
        failed.push({ email, name: fullName, error: rowErr.message });
      }
    }

    await logAdminAction(req.user.id, 'BULK_IMPORT_USERS', 'users', null, {
      total: rawUsers.length,
      succeededCount: succeeded.length,
      failedCount: failed.length,
    });

    res.status(201).json({
      success: true,
      total: rawUsers.length,
      succeededCount: succeeded.length,
      failedCount: failed.length,
      users: succeeded,
      errors: failed,
    });
  } catch (err) {
    console.error('[POST /api/admin/users/bulk Error]:', err);
    res.status(500).json({ error: 'Bulk import failed.' });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Edit user profile details, activate or deactivate
 */
router.patch('/:id', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin is not configured.' });
    }

    const { id } = req.params;
    const { is_active, approval_status, full_name, phone, details } = req.body;

    const profileUpdates = {};
    if (typeof is_active === 'boolean') {
      profileUpdates.is_active = is_active;
    }
    if (approval_status) {
      profileUpdates.approval_status = approval_status;
    }
    if (full_name) profileUpdates.full_name = full_name.trim();
    if (phone !== undefined) profileUpdates.phone = phone;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: pErr } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('id', id);

      if (pErr) return res.status(400).json({ error: pErr.message });
    }

    if (typeof is_active === 'boolean') {
      await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: is_active ? 'none' : '876000h',
      });
    }

    if (details && typeof details === 'object') {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', id)
        .single();

      if (userProfile?.role === 'student') {
        await supabaseAdmin.from('student_details').update(details).eq('profile_id', id);
      } else if (userProfile?.role === 'coordinator') {
        await supabaseAdmin.from('coordinator_details').update(details).eq('profile_id', id);
      }
    }

    await logAdminAction(req.user.id, 'UPDATE_USER', 'user', id, { updates: req.body });

    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    console.error('[PATCH /api/admin/users/:id Error]:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Set a new temporary password for the user
 */
router.post('/:id/reset-password', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin is not configured.' });
    }

    const { id } = req.params;
    const newPassword = req.body.password && req.body.password.length >= 8 
      ? req.body.password 
      : generateSecurePassword(12);

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: newPassword,
    });

    if (authErr) {
      return res.status(400).json({ error: authErr.message });
    }

    await logAdminAction(req.user.id, 'RESET_PASSWORD', 'user', id, {});

    res.json({
      success: true,
      message: 'Password reset successfully.',
      temporary_password: newPassword,
    });
  } catch (err) {
    console.error('[POST /api/admin/users/:id/reset-password Error]:', err);
    res.status(500).json({ error: 'Failed to reset user password.' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Remove user from Supabase Auth and database
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin is not configured.' });
    }

    const { id } = req.params;
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    await logAdminAction(req.user.id, 'DELETE_USER', 'user', id, {});

    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('[DELETE /api/admin/users/:id Error]:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

export default router;
