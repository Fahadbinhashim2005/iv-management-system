import http from 'node:http';
import url from 'node:url';
import crypto from 'node:crypto';

const PORT = process.env.PORT || 5000;

// In-memory data store for the backend API
const db = {
  users: [
    {
      id: "usr_student_01",
      email: "fahad@college.edu",
      role: "Student",
      name: "Fahad Bin Hashim",
      rollNo: "CS-2026-084",
      department: "Computer Science & Engineering",
      batch: "Batch 2023-27 (Semester 5)",
      bus: "Bus 04",
      seat: "14A",
      room: "304",
      avatar: "F",
    },
    {
      id: "usr_coord_01",
      email: "coordinator@college.edu",
      role: "Coordinator",
      name: "Dr. Rajesh Kumar",
      department: "Computer Science & Engineering",
      title: "HOD & Lead Tour Coordinator",
      avatar: "RK",
    },
  ],

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
      enrolled: 128,
      status: "Published",
      facultyInCharge: "Dr. Rajesh Kumar (HOD) & Prof. Anjali Menon",
      objectives: "FinTech architectures, cloud server datacenters, automated green infrastructure, and aerospace satellite telemetry.",
    },
    {
      id: "IV-2026-02",
      title: "Bangalore Tech Park & Aerospace Hub Study Tour",
      department: "Computer Science & Engineering",
      batch: "Batch 2024-28 (Semester 3)",
      host: "Infosys Mysore Campus & HAL Aerospace Heritage Centre",
      location: "Bengaluru & Mysuru, Karnataka",
      startDate: "2027-02-12",
      endDate: "2027-02-16",
      capacity: 120,
      enrolled: 84,
      status: "Draft",
      facultyInCharge: "Prof. Vikram Mohan",
      objectives: "Software engineering delivery pipelines, corporate datacenter management, and aerospace simulation.",
    },
  ],

  participants: [
    { id: 1, name: "Fahad Bin Hashim", roll: "CS-2026-084", batch: "CSE-A", bus: "Bus 04", seat: "14A", room: "304", consent: "Submitted", status: "Approved", parentPhone: "+91 94471 23456", bloodGroup: "O+" },
    { id: 2, name: "Rohan Varma", roll: "CS-2026-091", batch: "CSE-A", bus: "Bus 04", seat: "14B", room: "304", consent: "Submitted", status: "Approved", parentPhone: "+91 98450 11223", bloodGroup: "B+" },
    { id: 3, name: "Aditya Nair", roll: "CS-2026-015", batch: "CSE-A", bus: "Bus 04", seat: "15A", room: "304", consent: "Submitted", status: "Approved", parentPhone: "+91 94002 99887", bloodGroup: "A+" },
    { id: 4, name: "Ananya Iyer", roll: "CS-2026-022", batch: "CSE-B", bus: "Bus 01", seat: "06A", room: "201", consent: "Submitted", status: "Approved", parentPhone: "+91 98112 33445", bloodGroup: "O+" },
    { id: 5, name: "Kavya Ramesh", roll: "CS-2026-056", batch: "CSE-B", bus: "Bus 01", seat: "06B", room: "201", consent: "Submitted", status: "Approved", parentPhone: "+91 97441 55667", bloodGroup: "AB+" },
    { id: 6, name: "Sneha Sharma", roll: "CS-2026-042", batch: "CSE-A", bus: "Bus 02", seat: "11A", room: "202", consent: "Pending", status: "Pending", parentPhone: "+91 98950 66778", bloodGroup: "B+" },
    { id: 7, name: "Vignesh Rajan", roll: "CS-2026-118", batch: "CSE-B", bus: "Bus 02", seat: "11B", room: "202", consent: "Pending", status: "Pending", parentPhone: "+91 94460 77889", bloodGroup: "O-" },
    { id: 8, name: "Mohammed Althaf", roll: "CS-2026-068", batch: "CSE-B", bus: "Unassigned", seat: "--", room: "--", consent: "Pending", status: "Waitlisted", parentPhone: "+91 98470 88990", bloodGroup: "A+" },
  ],

  attendanceRecords: [
    { id: "att_1", studentId: 1, name: "Fahad Bin Hashim", roll: "CS-2026-084", checkpoint: "Gate #2 Departure", status: "Verified", time: "05:58 AM", method: "QR Pass Scan", verifiedBy: "Dr. Rajesh Kumar" },
    { id: "att_2", studentId: 2, name: "Rohan Varma", roll: "CS-2026-091", checkpoint: "Gate #2 Departure", status: "Verified", time: "06:01 AM", method: "QR Pass Scan", verifiedBy: "Dr. Rajesh Kumar" },
    { id: "att_3", studentId: 3, name: "Aditya Nair", roll: "CS-2026-015", checkpoint: "Gate #2 Departure", status: "Verified", time: "06:04 AM", method: "QR Pass Scan", verifiedBy: "Dr. Rajesh Kumar" },
    { id: "att_4", studentId: 4, name: "Ananya Iyer", roll: "CS-2026-022", checkpoint: "Gate #2 Departure", status: "Verified", time: "06:05 AM", method: "QR Pass Scan", verifiedBy: "Dr. Rajesh Kumar" },
    { id: "att_5", studentId: 5, name: "Kavya Ramesh", roll: "CS-2026-056", checkpoint: "Gate #2 Departure", status: "Verified", time: "06:07 AM", method: "QR Pass Scan", verifiedBy: "Dr. Rajesh Kumar" },
  ],

  announcements: [
    {
      id: "ann_1",
      title: "Mandatory Formal Dress Code for GIFT City Visit",
      category: "Urgent",
      date: "Nov 22, 2026 • 09:30 AM",
      author: "Dr. Rajesh Kumar (HOD CS)",
      content: "All students visiting GIFT City on Dec 6 must wear formal attire (formals with blazers/formal shirts) and carry their valid physical College ID card. Entrance will be denied by GIFT security for casual wear or sneakers.",
      pinned: true,
    },
    {
      id: "ann_2",
      title: "Assembly Timing & Luggage Tagging Protocol",
      category: "Logistics",
      date: "Nov 21, 2026 • 04:15 PM",
      author: "Prof. Anjali Menon",
      content: "Please collect color-coded luggage tags from the department office by Dec 3. On Dec 5, buses start boarding at 06:00 AM sharp at Gate #2. Late arrivals cannot be accommodated as highway permissions are timed.",
      pinned: false,
    },
  ],

  logistics: {
    buses: [
      { id: "BUS-04", name: "Bus 04 (Alpha Unit)", regNo: "GJ-01-BX-8824", capacity: 45, allocated: 43, driver: "Mr. Suresh Patel", phone: "+91 98765 43210" },
      { id: "BUS-01", name: "Bus 01 (Beta Unit)", regNo: "GJ-01-CT-4412", capacity: 45, allocated: 45, driver: "Mr. Ramesh Kumar", phone: "+91 97451 22334" },
      { id: "BUS-02", name: "Bus 02 (Gamma Unit)", regNo: "GJ-01-DD-9102", capacity: 45, allocated: 40, driver: "Mr. Harish Patel", phone: "+91 98950 44556" },
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

// Active sessions mapping: token -> user
const activeSessions = new Map();

// Helper to send JSON responses with CORS headers
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  try {
    // 1. Health check
    if (path === '/api/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'online',
        service: 'IV Connect Core API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Authentication Login
    if (path === '/api/auth/login' && method === 'POST') {
      const { email, password, role } = await parseBody(req);
      const targetRole = role || 'Student';

      // Find or default user based on role
      let user = db.users.find(
        (u) => u.role.toLowerCase() === targetRole.toLowerCase() && (email ? u.email.toLowerCase() === email.toLowerCase() : true)
      );

      if (!user) {
        // Fallback default for role
        user = db.users.find((u) => u.role.toLowerCase() === targetRole.toLowerCase()) || db.users[0];
      }

      // Generate session token
      const token = `iv_token_${crypto.randomBytes(16).toString('hex')}`;
      activeSessions.set(token, user);

      return sendJson(res, 200, {
        success: true,
        token,
        user,
        message: `Welcome, ${user.name}! Authenticated as ${user.role}.`,
      });
    }

    // 3. Current User Profile
    if (path === '/api/auth/me' && method === 'GET') {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.replace('Bearer ', '');
      const user = activeSessions.get(token) || db.users[0];

      return sendJson(res, 200, { success: true, user });
    }

    // 4. Industrial Visits (GET / POST)
    if (path === '/api/visits') {
      if (method === 'GET') {
        return sendJson(res, 200, { success: true, count: db.visits.length, visits: db.visits });
      }
      if (method === 'POST') {
        const body = await parseBody(req);
        const newVisit = {
          id: `IV-${new Date().getFullYear()}-0${db.visits.length + 1}`,
          title: body.title || "New Industrial Visit",
          department: body.department || "Computer Science & Engineering",
          batch: body.batch || "Batch 2023-27",
          host: body.host || "Host Organization",
          location: body.location || "City, State",
          startDate: body.startDate || "2026-12-05",
          endDate: body.endDate || "2026-12-08",
          capacity: Number(body.capacity) || 120,
          enrolled: 0,
          status: "Published",
          facultyInCharge: body.facultyInCharge || "Dr. Rajesh Kumar",
          objectives: body.objectives || "Industrial exposure and technical seminars.",
        };
        db.visits.unshift(newVisit);
        return sendJson(res, 201, { success: true, visit: newVisit, message: "Visit created successfully." });
      }
    }

    // 5. Participants Roster (GET / PATCH status)
    if (path === '/api/participants' && method === 'GET') {
      return sendJson(res, 200, {
        success: true,
        total: db.participants.length,
        approved: db.participants.filter((p) => p.status === 'Approved').length,
        pending: db.participants.filter((p) => p.status === 'Pending').length,
        participants: db.participants,
      });
    }

    if (path.startsWith('/api/participants/') && method === 'PATCH') {
      const id = parseInt(path.split('/')[3], 10);
      const { status } = await parseBody(req);
      const participant = db.participants.find((p) => p.id === id);

      if (!participant) {
        return sendJson(res, 404, { success: false, error: 'Participant not found.' });
      }

      participant.status = status;
      return sendJson(res, 200, {
        success: true,
        participant,
        message: `Updated ${participant.name}'s enrollment status to ${status}.`,
      });
    }

    // 6. Attendance Sessions & Verification (GET / POST)
    if (path === '/api/attendance' && method === 'GET') {
      return sendJson(res, 200, {
        success: true,
        checkpoint: "Gate #2 Departure",
        records: db.attendanceRecords,
        totalRecords: db.attendanceRecords.length,
      });
    }

    if (path === '/api/attendance/check-in' && method === 'POST') {
      const { studentId, rollNo, checkpoint, method: checkInMethod } = await parseBody(req);

      // Find student by ID or roll
      const student = db.participants.find((p) => p.id === studentId || p.roll === rollNo) || {
        name: "Verified Student",
        roll: rollNo || "CS-2026-084",
        bus: "Bus 04",
        seat: "14A",
      };

      const record = {
        id: `att_${Date.now()}`,
        studentId: student.id || 1,
        name: student.name,
        roll: student.roll,
        checkpoint: checkpoint || "Gate #2 Departure",
        status: "Verified",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        method: checkInMethod || "QR Pass Scan",
        verifiedBy: "Dr. Rajesh Kumar (Coordinator)",
      };

      db.attendanceRecords.push(record);
      return sendJson(res, 201, {
        success: true,
        record,
        message: `Check-in recorded for ${student.name} (${student.roll}).`,
      });
    }

    // 7. Announcements (GET / POST)
    if (path === '/api/announcements') {
      if (method === 'GET') {
        return sendJson(res, 200, { success: true, announcements: db.announcements });
      }
      if (method === 'POST') {
        const body = await parseBody(req);
        const newAnnouncement = {
          id: `ann_${Date.now()}`,
          title: body.title,
          category: body.category || "General",
          date: "Just now",
          author: body.author || "Dr. Rajesh Kumar (HOD CS)",
          content: body.content,
          pinned: false,
        };
        db.announcements.unshift(newAnnouncement);
        return sendJson(res, 201, {
          success: true,
          announcement: newAnnouncement,
          message: "Announcement broadcasted successfully to all enrolled students.",
        });
      }
    }

    // 8. Logistics
    if (path === '/api/logistics' && method === 'GET') {
      return sendJson(res, 200, { success: true, logistics: db.logistics });
    }

    // Fallback 404
    return sendJson(res, 404, { success: false, error: 'Endpoint not found' });
  } catch (error) {
    console.error('API Error:', error);
    return sendJson(res, 500, { success: false, error: 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`[IV Connect API Server] running on http://localhost:${PORT}`);
});
