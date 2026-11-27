import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { db } from './db.js';
import {
  requireAuth,
  requireRole,
  supabaseAdmin,
  supabasePublic,
  isSupabaseConfiguredOnServer,
  issueServerToken,
} from './middleware/auth.js';
import adminUsersRouter from './routes/adminUsers.js';
import attendanceRouter from './routes/attendance.js';
import announcementsRouter from './routes/announcements.js';
import roomsRouter from './routes/rooms.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_FALLBACK_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@IV2026!';

// 1. Security HTTP Headers
app.use(helmet());

// 2. CORS Policy
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://ivconnect.vercel.app',
      'https://iv-management-system.vercel.app',
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  })
);

// 3. Body parser
app.use(express.json());

// 4. Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many administrative requests. Please slow down.' },
});

// -----------------------------------------------------------------------------
// Core System & Health Endpoints
// -----------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    service: 'IV Connect Core API',
    status: 'online',
    version: '2.2.0',
    supabaseAdminReady: Boolean(supabaseAdmin),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: 'online',
    service: 'IV Connect Core API',
    version: '2.2.0',
    supabaseAdminReady: Boolean(supabaseAdmin),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    status: 'online',
    service: 'IV Connect Core API',
    version: '2.2.0',
    supabaseAdminReady: Boolean(supabaseAdmin),
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------------------------------------------------------
// Self-Registration / Access Request & Sign-in Gateway
// -----------------------------------------------------------------------------
app.post('/api/auth/sign-in-or-request', authLimiter, async (req, res) => {
  try {
    const { email, password, role, full_name } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = (role || 'student').toLowerCase();

    if (!['student', 'coordinator', 'admin'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Invalid role selection.' });
    }

    // 1. Supabase Admin Mode (true service_role key configured)
    if (supabaseAdmin) {
      const { data: profile, error: lookupErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (lookupErr) {
        console.error('[sign-in-or-request profile lookup error]:', lookupErr.message);
        return res.status(500).json({ error: 'Unable to check account status right now.' });
      }

      if (profile) {
        if (profile.approval_status === 'pending') {
          return res.json({
            status: 'pending',
            exists: true,
            role: profile.role,
            message: 'Your access request is currently pending Admin approval. You will be able to log in once the administrator approves your request.',
          });
        }
        if (profile.approval_status === 'rejected') {
          return res.status(403).json({
            status: 'rejected',
            exists: true,
            error: 'Your access request was declined by the administrator.',
          });
        }
        if (profile.is_active === false && String(profile.role).toLowerCase() !== 'admin') {
          return res.status(403).json({
            status: 'inactive',
            exists: true,
            error: 'Your account has been deactivated by the administrator.',
          });
        }

        // Ensure approved auth users are unbanned & email-confirmed
        try {
          await supabaseAdmin.auth.admin.updateUserById(profile.id, {
            email_confirm: true,
            ban_duration: 'none',
          });
        } catch {
          // Ignore non-fatal auth confirm note
        }

        return res.json({
          status: 'approved',
          exists: true,
          role: profile.role,
          message: 'Account is approved. Please sign in.',
        });
      }

      // First-time user check
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      if (normalizedRole === 'admin') {
        return res.status(403).json({
          error: 'Administrator accounts cannot self-register. Please sign in with approved admin credentials.',
        });
      }

      const rawPrefix = normalizedEmail.split('@')[0];
      const derivedName =
        full_name?.trim() ||
        rawPrefix
          .replace(/[._-]+/g, ' ')
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

      let authUserId = null;
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        app_metadata: { role: normalizedRole },
        user_metadata: { full_name: derivedName, role: normalizedRole },
      });

      if (authErr) {
        // User already exists in auth.users -> DO NOT overwrite or ban!
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const found = existingUsers?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);
        if (found) {
          authUserId = found.id;
          // Ensure email confirmed and unbanned
          await supabaseAdmin.auth.admin.updateUserById(authUserId, {
            email_confirm: true,
            ban_duration: 'none',
          });
        } else {
          return res.status(400).json({ error: authErr.message });
        }
      } else {
        authUserId = authData.user.id;
      }

      // Insert pending profile ONLY if it does not already exist (never overwrite an existing row!)
      const { error: pErr } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id: authUserId,
            email: normalizedEmail,
            full_name: derivedName,
            role: normalizedRole,
            approval_status: 'pending',
            is_active: false,
            must_change_password: false,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );

      if (pErr) {
        console.warn('[sign-in-or-request profile insert note]:', pErr.message);
      }

      await supabaseAdmin.from('audit_logs').insert({
        action: 'SUBMIT_ACCESS_REQUEST',
        resource_type: 'user',
        resource_id: authUserId,
        details: { email: normalizedEmail, role: normalizedRole, full_name: derivedName },
      });

      return res.status(201).json({
        success: true,
        status: 'request_created',
        message: 'Access request submitted! Your account has been sent to the Admin for approval. Once approved, you can log in directly with this password.',
      });
    }

    // 2. If Supabase Public client is configured (but service_role isn't set on Railway),
    // try safe RPC check before touching memory!
    if (supabasePublic) {
      const { data: rpcStatus, error: rpcErr } = await supabasePublic.rpc('get_account_login_status', {
        lookup_email: normalizedEmail,
      });

      if (!rpcErr && rpcStatus?.exists) {
        if (rpcStatus.approval_status === 'pending') {
          return res.json({
            status: 'pending',
            exists: true,
            role: rpcStatus.role,
            message: 'Your access request is currently pending Admin approval.',
          });
        }
        if (rpcStatus.approval_status === 'rejected') {
          return res.status(403).json({
            status: 'rejected',
            exists: true,
            error: 'Your access request was declined by the administrator.',
          });
        }
        return res.json({
          status: rpcStatus.approval_status || 'approved',
          exists: true,
          role: rpcStatus.role,
        });
      }

      // Cannot safely bypass RLS without service role key
      return res.status(503).json({
        error: 'Backend requires Supabase sign-in directly or SUPABASE_SERVICE_ROLE_KEY configuration.',
      });
    }

    // 3. Pure In-Memory Mode (Local dev fallback when Supabase is NOT configured at all)
    const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.json({
        status: existing.approval_status || 'approved',
        exists: true,
        role: existing.role,
        message:
          existing.approval_status === 'pending'
            ? 'Your access request is currently pending Admin approval.'
            : 'Account exists. Please sign in.',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    if (normalizedRole === 'admin') {
      return res.status(403).json({ error: 'Administrator accounts cannot self-register.' });
    }

    const newReqUser = {
      id: `usr_${Date.now()}`,
      email: normalizedEmail,
      name: full_name?.trim() || normalizedEmail.split('@')[0],
      full_name: full_name?.trim() || normalizedEmail.split('@')[0],
      role: normalizedRole,
      approval_status: 'pending',
      is_active: false,
      password,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    db.users.push(newReqUser);

    return res.status(201).json({
      success: true,
      status: 'request_created',
      message: 'Access request submitted! Your account has been sent to the Admin for approval.',
    });
  } catch (err) {
    console.error('[sign-in-or-request error]:', err);
    res.status(500).json({ error: 'Server error processing request.' });
  }
});

/**
 * POST /api/auth/login
 * Unified sign-in endpoint with real password verification
 */
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const cleanEmail = email.trim().toLowerCase();

    // 1. Supabase Verification Mode (when Supabase URL/Key is configured)
    if (isSupabaseConfiguredOnServer && supabasePublic) {
      // First attempt real password check via Supabase Auth
      let { data: authData, error: authErr } = await supabasePublic.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      // If Supabase rejected ONLY because email wasn't confirmed yet AND we have admin client:
      // Wait: confirm ONLY if user is approved, then re-try signInWithPassword so password STILL gets verified!
      if (authErr && authErr.message?.toLowerCase().includes('email not confirmed') && supabaseAdmin) {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('id, approval_status, role, is_active')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (prof && (prof.role === 'admin' || prof.approval_status === 'approved')) {
          await supabaseAdmin.auth.admin.updateUserById(prof.id, {
            email_confirm: true,
            ban_duration: 'none',
          });
          const retry = await supabasePublic.auth.signInWithPassword({ email: cleanEmail, password });
          authData = retry.data;
          authErr = retry.error;
        }
      }

      if (!authErr && authData?.user && authData?.session) {
        // Query user profile using either admin client or the newly issued session token
        const sb = supabaseAdmin || supabasePublic;
        const { data: profile } = await sb
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        const resolvedProfile = profile || {
          id: authData.user.id,
          email: authData.user.email,
          full_name: authData.user.user_metadata?.full_name || 'User',
          role: authData.user.app_metadata?.role || 'student',
          approval_status: 'approved',
          is_active: true,
        };

        if (String(resolvedProfile.role).toLowerCase() !== 'admin') {
          if (resolvedProfile.approval_status === 'pending') {
            return res.status(403).json({ error: 'Your access request is currently pending Admin approval.' });
          }
          if (resolvedProfile.approval_status === 'rejected') {
            return res.status(403).json({ error: 'Your access request was declined by the administrator.' });
          }
          if (resolvedProfile.is_active === false) {
            return res.status(403).json({ error: 'Your account has been deactivated.' });
          }
        }

        return res.json({
          success: true,
          token: authData.session.access_token,
          session: {
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
          },
          user: resolvedProfile,
        });
      }

      // Check Chief Administrator configured bootstrap credential (exact password required!)
      if (cleanEmail === 'admin@college.edu' && password === ADMIN_FALLBACK_PASSWORD) {
        const adminUser = {
          id: 'usr_admin_01',
          email: 'admin@college.edu',
          full_name: 'Chief Administrator',
          name: 'Chief Administrator',
          role: 'admin',
          approval_status: 'approved',
          is_active: true,
        };
        return res.json({
          success: true,
          token: issueServerToken(adminUser),
          user: adminUser,
        });
      }

      return res.status(401).json({ error: authErr?.message || 'Invalid login credentials.' });
    }

    // 2. Pure In-Memory Mode (Local dev without Supabase)
    if (cleanEmail === 'admin@college.edu') {
      if (password !== ADMIN_FALLBACK_PASSWORD) {
        return res.status(401).json({ error: 'Invalid administrator credentials.' });
      }
      const adminUser = {
        id: 'usr_admin_01',
        email: 'admin@college.edu',
        full_name: 'Chief Administrator',
        name: 'Chief Administrator',
        role: 'admin',
        approval_status: 'approved',
        is_active: true,
      };
      return res.json({
        success: true,
        token: issueServerToken(adminUser),
        user: adminUser,
      });
    }

    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Account not found. Please sign in to submit an access request.' });
    }

    if (user.password && user.password !== password) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }

    if (user.role !== 'admin') {
      if (user.approval_status === 'pending') {
        return res.status(403).json({ error: 'Your access request is currently pending Admin approval.' });
      }
      if (user.approval_status === 'rejected') {
        return res.status(403).json({ error: 'Your access request was declined by the administrator.' });
      }
      if (user.is_active === false) {
        return res.status(403).json({ error: 'Your account has been deactivated.' });
      }
    }

    return res.json({
      success: true,
      token: issueServerToken(user),
      user: {
        id: user.id,
        email: user.email,
        full_name: user.name || user.full_name || 'User',
        name: user.name || user.full_name || 'User',
        role: user.role,
        approval_status: user.approval_status,
        is_active: user.is_active,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// -----------------------------------------------------------------------------
// Authentication Profile & Password Confirmation
// -----------------------------------------------------------------------------
app.post('/api/auth/password-changed', authLimiter, requireAuth, async (req, res) => {
  try {
    const sb = req.supabase || supabaseAdmin;
    if (sb) {
      await sb.from('profiles').update({ must_change_password: false }).eq('id', req.user.id);
    }
    return res.json({ success: true, message: 'Password update confirmed.' });
  } catch {
    return res.status(500).json({ error: 'Failed to record password change.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const sb = req.supabase || supabaseAdmin;
    if (sb) {
      const { data: profile } = await sb.from('profiles').select('*').eq('id', req.user.id).maybeSingle();
      if (profile) {
        return res.json({ success: true, user: profile });
      }
    }
    return res.json({ success: true, user: req.user });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// -----------------------------------------------------------------------------
// Administrative User Management & Request Authorization Routes
// -----------------------------------------------------------------------------
app.use('/api/admin/users', adminLimiter, requireAuth, requireRole('admin'), adminUsersRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api', roomsRouter);

// -----------------------------------------------------------------------------
// Role-Specific Sub-APIs
// -----------------------------------------------------------------------------
const studentRouter = express.Router();
studentRouter.get('/my-status', (req, res) => {
  res.json({
    success: true,
    studentId: req.user.id,
    role: req.user.role,
    approval_status: req.user.approval_status,
    verified: true,
  });
});
app.use('/api/student', requireAuth, requireRole('student', 'admin'), studentRouter);

const coordinatorRouter = express.Router();
coordinatorRouter.get('/overview', (req, res) => {
  res.json({
    success: true,
    coordinatorId: req.user.id,
    assignedVisits: db.visits.length,
    participants: db.participants.length,
  });
});

coordinatorRouter.get('/students', async (req, res) => {
  try {
    const sb = req.supabase || supabaseAdmin;

    if (!isSupabaseConfiguredOnServer) {
      const approved = db.users
        .filter(
          (u) =>
            String(u.role || '').toLowerCase() === 'student' &&
            (u.approval_status || 'approved') === 'approved'
        )
        .map((u) => ({
          ...u,
          bus_no: null,
          seat_no: null,
          room_no: null,
          hotel_name: null,
          room_assignments: [],
        }));
      return res.json({ success: true, count: approved.length, students: approved });
    }

    if (!sb) {
      return res.status(503).json({ error: 'Database client unavailable.' });
    }

    const { data: profiles, error: pErr } = await sb
      .from('profiles')
      .select(
        'id, email, full_name, role, gender, phone, roll_no, department, batch, semester, is_active, approval_status, guardian_name, guardian_relation, emergency_phone, blood_group, medical_notes, dietary_preference, consent_given, consent_at, avatar_type, avatar_url, avatar_style, avatar_seed, created_at'
      )
      .eq('role', 'student')
      .eq('approval_status', 'approved')
      .order('full_name', { ascending: true });

    if (pErr) {
      return res.status(500).json({ error: pErr.message });
    }

    return res.json({ success: true, count: (profiles || []).length, students: profiles || [] });
  } catch (err) {
    console.error('[GET /api/coordinator/students Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve approved students.' });
  }
});
app.use('/api/coordinator', requireAuth, requireRole('coordinator', 'admin'), coordinatorRouter);

const adminRouter = express.Router();
adminRouter.get('/system-metrics', async (req, res) => {
  let pendingCount = 0;
  const sb = req.supabase || supabaseAdmin;
  if (sb) {
    const { count } = await sb
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'pending');
    pendingCount = count || 0;
  } else {
    pendingCount = db.users.filter((u) => u.approval_status === 'pending').length;
  }

  res.json({
    success: true,
    activeVisits: db.visits.length,
    totalStudents: db.participants.length,
    pendingAccessRequests: pendingCount,
    securityLevel: 'RLS_ENFORCED',
  });
});
app.use('/api/admin', requireAuth, requireRole('admin'), adminRouter);

// -----------------------------------------------------------------------------
// Operational Endpoints (Authenticated)
// -----------------------------------------------------------------------------
app.get('/api/visits', requireAuth, (req, res) => {
  res.json({ success: true, count: db.visits.length, visits: db.visits });
});

app.post('/api/visits', requireAuth, requireRole('coordinator', 'admin'), (req, res) => {
  const body = req.body;
  const newVisit = {
    id: `IV-${new Date().getFullYear()}-0${db.visits.length + 1}`,
    title: body.title || 'New Industrial Visit',
    department: body.department || 'Computer Science & Engineering',
    batch: body.batch || 'Batch 2023-27',
    host: body.host || 'Host Organization',
    location: body.location || 'City, State',
    startDate: body.startDate || '2026-12-05',
    endDate: body.endDate || '2026-12-08',
    capacity: Number(body.capacity) || 120,
    enrolled: 0,
    status: 'Published',
    facultyInCharge: body.facultyInCharge || req.user.name || 'Tour Coordinator',
    objectives: body.objectives || 'Industrial exposure and technical seminars.',
  };
  db.visits.unshift(newVisit);
  res.status(201).json({ success: true, visit: newVisit, message: 'Visit created successfully.' });
});

app.get('/api/participants', requireAuth, requireRole('coordinator', 'admin'), (req, res) => {
  res.json({
    success: true,
    total: db.participants.length,
    approved: db.participants.filter((p) => p.status === 'Approved').length,
    pending: db.participants.filter((p) => p.status === 'Pending').length,
    participants: db.participants,
  });
});

app.patch('/api/participants/:id/status', requireAuth, requireRole('admin'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  const participant = db.participants.find((p) => p.id === id);

  if (!participant) {
    return res.status(404).json({ success: false, error: 'Participant not found.' });
  }

  participant.status = status;
  res.json({
    success: true,
    participant,
    message: `Updated ${participant.name}'s enrollment status to ${status}.`,
  });
});

app.get('/api/attendance', requireAuth, (req, res) => {
  if (req.user.role === 'student') {
    const ownRecords = db.attendanceRecords.filter((r) => r.roll === req.user.roll_no || r.name === req.user.name);
    return res.json({
      success: true,
      checkpoint: 'Gate #2 Departure',
      records: ownRecords,
      totalRecords: ownRecords.length,
    });
  }

  res.json({
    success: true,
    checkpoint: 'Gate #2 Departure',
    records: db.attendanceRecords,
    totalRecords: db.attendanceRecords.length,
  });
});

app.post('/api/attendance/check-in', requireAuth, requireRole('coordinator', 'admin'), (req, res) => {
  const { studentId, rollNo, checkpoint, method: checkInMethod } = req.body;

  const student = db.participants.find((p) => p.id === studentId || p.roll === rollNo) || {
    name: req.user.name,
    roll: rollNo || 'CS-2026-001',
    bus: 'Bus 01',
    seat: '01A',
  };

  const record = {
    id: `att_${Date.now()}`,
    studentId: student.id || 1,
    name: student.name,
    roll: student.roll,
    checkpoint: checkpoint || 'Gate #2 Departure',
    status: 'Verified',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    method: checkInMethod || 'QR Pass Scan',
    verifiedBy: req.user.name || 'Coordinator',
  };

  db.attendanceRecords.push(record);
  res.status(201).json({
    success: true,
    record,
    message: `Check-in recorded for ${student.name} (${student.roll}).`,
  });
});

app.get('/api/logistics', requireAuth, (req, res) => {
  res.json({ success: true, logistics: db.logistics });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.listen(PORT, () => {
  console.log(
    `[IV Connect API Server] running on http://localhost:${PORT} (Supabase: ${
      supabaseAdmin ? 'ADMIN_SERVICE_ROLE' : isSupabaseConfiguredOnServer ? 'USER_SCOPED_RLS' : 'IN_MEMORY_DEV'
    })`
  );
});

export default app;
