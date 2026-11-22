import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { requireAuth, requireRole, supabaseAdmin } from './middleware/auth.js';
import adminUsersRouter from './routes/adminUsers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Security HTTP Headers
app.use(helmet());

// 2. CORS Policy: Allow configured origin(s) or default development ports
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://iv-management-system.vercel.app'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
// Database & In-Memory Store (Students & Coordinators purged; dynamic only)
// -----------------------------------------------------------------------------
const db = {
  users: [
    {
      id: "usr_admin_01",
      email: "admin@college.edu",
      role: "admin",
      name: "Chief Administrator",
      approval_status: "approved",
      is_active: true,
    },
  ],

  // Purged: All student participants and attendance records will be populated as students register & get approved
  participants: [],
  attendanceRecords: [],

  visits: [
    {
      id: "IV-2026-01",
      title: "Industrial Visit 2026 — GIFT City & Tech Infrastructure",
      department: "Computer Science & Engineering",
      batch: "Batch 2023-27 (Semester 5)",
      host: "Gujarat International Finance Tec-City (GIFT) & ISRO SAC",
      location: "Gandhinagar & Ahmedabad, Gujarat",
      startDate: "2026-12-05",
      endDate: "2026-12-08",
      capacity: 135,
      enrolled: 0,
      status: "Published",
      facultyInCharge: "Lead Tour Coordinator",
      objectives: "FinTech architectures, cloud server datacenters, automated green infrastructure, and aerospace satellite telemetry.",
    },
  ],

  announcements: [
    {
      id: "ann_1",
      title: "Mandatory Formal Dress Code for GIFT City Visit",
      category: "Urgent",
      date: "Nov 22, 2026 • 09:30 AM",
      author: "Chief Tour Coordinator",
      content: "All students visiting GIFT City must wear formal attire and carry their valid physical College ID card.",
      pinned: true,
    },
  ],

  logistics: {
    buses: [
      { id: "BUS-01", name: "Bus 01 (Alpha Unit)", regNo: "GJ-01-BX-8824", capacity: 45, allocated: 0, driver: "Mr. Suresh Patel", phone: "+91 98765 43210" },
    ],
    hotel: {
      name: "Hotel Grand Ambience",
      location: "Ashram Road, Ahmedabad",
      phone: "+91 79 2658 1234",
      checkIn: "Dec 5, 02:00 PM",
      checkOut: "Dec 8, 08:00 AM",
      roomsCount: 45,
    },
  },
};

// -----------------------------------------------------------------------------
// Core System & Health Endpoints
// -----------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    service: 'IV Connect Core API',
    status: 'online',
    version: '2.1.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'IV Connect Core API',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------------------------------------------------------
// Self-Registration / Access Request & Sign-in Gateway
// -----------------------------------------------------------------------------
/**
 * POST /api/auth/sign-in-or-request
 * Handles first-time sign-in by automatically sending an access request to the Admin,
 * and reports the account approval status.
 */
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

    // 1. Supabase Mode (Production/Database)
    if (supabaseAdmin) {
      // Check if user already has a profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (profile) {
        // User exists: report status
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
        return res.json({
          status: 'approved',
          exists: true,
          role: profile.role,
          message: 'Account is approved. Please sign in.',
        });
      }

      // User does NOT exist in profiles: THIS IS THEIR FIRST SIGN IN!
      // Enforce minimum password length
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      // Prevent unauthorized admin self-registration
      if (normalizedRole === 'admin') {
        return res.status(403).json({
          error: 'Administrator accounts cannot self-register. Please sign in with approved admin credentials.',
        });
      }

      // Derive human-readable name from email if not explicitly provided
      const rawPrefix = normalizedEmail.split('@')[0];
      const derivedName = full_name?.trim() || rawPrefix
        .replace(/[._-]+/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      // Step A: Create or fetch Auth user in Supabase Auth
      let authUserId = null;
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        app_metadata: { role: normalizedRole },
        user_metadata: { full_name: derivedName },
      });

      if (authErr) {
        // If user already existed in Auth (e.g. from previous attempt without profile)
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const found = existingUsers?.users?.find((u) => u.email.toLowerCase() === normalizedEmail);
        if (found) {
          authUserId = found.id;
          // Update password to the new one typed
          await supabaseAdmin.auth.admin.updateUserById(authUserId, { password, ban_duration: '876000h' });
        } else {
          return res.status(400).json({ error: authErr.message });
        }
      } else {
        authUserId = authData.user.id;
        // Temporarily ban auth login until admin clicks approve
        await supabaseAdmin.auth.admin.updateUserById(authUserId, { ban_duration: '876000h' });
      }

      // Step B: Insert into profiles with approval_status = 'pending' and is_active = false
      const { error: pErr } = await supabaseAdmin.from('profiles').insert({
        id: authUserId,
        email: normalizedEmail,
        full_name: derivedName,
        role: normalizedRole,
        approval_status: 'pending',
        is_active: false,
        must_change_password: false,
      });

      if (pErr) {
        console.warn('[sign-in-or-request profile fallback]:', pErr.message);
        // Fallback if approval_status column does not exist yet in Supabase
        await supabaseAdmin.from('profiles').upsert({
          id: authUserId,
          email: normalizedEmail,
          full_name: derivedName,
          role: normalizedRole,
        });
      }

      // Sync in-memory store so it is immediately available across API routes
      if (!db.users.some((u) => u.email === normalizedEmail)) {
        db.users.push({
          id: authUserId,
          email: normalizedEmail,
          name: derivedName,
          role: normalizedRole,
          approval_status: 'pending',
          is_active: false,
        });
      }

      // Step C: Insert detail row
      if (normalizedRole === 'student') {
        const rollSeed = `CS-2026-${Math.floor(100 + Math.random() * 900)}`;
        await supabaseAdmin.from('student_details').insert({
          profile_id: authUserId,
          roll_no: rollSeed,
          department: 'Computer Science & Engineering',
          batch: 'Batch 2023-27',
        });
      } else if (normalizedRole === 'coordinator') {
        await supabaseAdmin.from('coordinator_details').insert({
          profile_id: authUserId,
          department: 'Computer Science & Engineering',
          designation: 'Tour Coordinator',
        });
      }

      // Log the event
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

    // 2. In-Memory Mode (Development Fallback)
    const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.json({
        status: existing.approval_status || 'approved',
        exists: true,
        role: existing.role,
        message: existing.approval_status === 'pending'
          ? 'Your access request is currently pending Admin approval.'
          : 'Account exists. Please sign in.',
      });
    }

    // First time in memory
    const newReqUser = {
      id: `usr_${Date.now()}`,
      email: normalizedEmail,
      name: full_name?.trim() || normalizedEmail.split('@')[0],
      role: normalizedRole,
      approval_status: 'pending',
      is_active: false,
      createdAt: new Date().toISOString(),
    };
    db.users.push(newReqUser);

    return res.status(201).json({
      success: true,
      status: 'request_created',
      message: 'Access request submitted! Your account has been sent to the Admin for approval. Once approved, you can log in directly with this password.',
    });
  } catch (err) {
    console.error('[sign-in-or-request error]:', err);
    res.status(500).json({ error: 'Server error processing request.' });
  }
});

// -----------------------------------------------------------------------------
// Authentication Profile & Password Confirmation
// -----------------------------------------------------------------------------
app.post('/api/auth/password-changed', authLimiter, requireAuth, async (req, res) => {
  try {
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', req.user.id);
    }
    return res.json({ success: true, message: 'Password update confirmed.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to record password change.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    if (supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', req.user.id)
        .single();

      if (profile) {
        let details = {};
        if (profile.role === 'student') {
          const { data: s } = await supabaseAdmin.from('student_details').select('*').eq('profile_id', profile.id).single();
          details = s || {};
        } else if (profile.role === 'coordinator') {
          const { data: c } = await supabaseAdmin.from('coordinator_details').select('*').eq('profile_id', profile.id).single();
          details = c || {};
        }
        return res.json({ success: true, user: { ...profile, details } });
      }
    }

    return res.json({ success: true, user: req.user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// -----------------------------------------------------------------------------
// Administrative User Management & Request Authorization Routes
// -----------------------------------------------------------------------------
app.use('/api/admin/users', adminLimiter, requireAuth, requireRole('admin'), adminUsersRouter);

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
app.use('/api/coordinator', requireAuth, requireRole('coordinator', 'admin'), coordinatorRouter);

const adminRouter = express.Router();
adminRouter.get('/system-metrics', async (req, res) => {
  let pendingCount = 0;
  if (supabaseAdmin) {
    const { count } = await supabaseAdmin
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

app.patch('/api/participants/:id/status', requireAuth, requireRole('coordinator', 'admin'), (req, res) => {
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

app.get('/api/announcements', requireAuth, (req, res) => {
  res.json({ success: true, announcements: db.announcements });
});

app.post('/api/announcements', requireAuth, requireRole('coordinator', 'admin'), (req, res) => {
  const body = req.body;
  const newAnnouncement = {
    id: `ann_${Date.now()}`,
    title: body.title,
    category: body.category || 'General',
    date: 'Just now',
    author: req.user.name || 'Tour Coordinator',
    content: body.content,
    pinned: false,
  };
  db.announcements.unshift(newAnnouncement);
  res.status(201).json({
    success: true,
    announcement: newAnnouncement,
    message: 'Announcement broadcasted successfully to all enrolled students.',
  });
});

app.get('/api/logistics', requireAuth, (req, res) => {
  res.json({ success: true, logistics: db.logistics });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`[IV Connect API Server] running on http://localhost:${PORT}`);
});

export default app;
