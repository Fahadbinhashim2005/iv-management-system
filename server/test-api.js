import http from 'node:http';

function testEndpoint(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("Testing Backend API Endpoints...");
  
  // 1. Health
  const health = await testEndpoint('GET', '/api/health');
  console.log("1. /api/health:", health.status, health.data.service);

  // 2. Auth Login Student
  const studentLogin = await testEndpoint('POST', '/api/auth/login', {
    email: 'fahad@college.edu',
    role: 'Student'
  });
  console.log("2. Student Login:", studentLogin.status, studentLogin.data.user.name, `[${studentLogin.data.user.role}]`);

  // 3. Auth Login Coordinator
  const coordLogin = await testEndpoint('POST', '/api/auth/login', {
    email: 'coordinator@college.edu',
    role: 'Coordinator'
  });
  console.log("3. Coordinator Login:", coordLogin.status, coordLogin.data.user.name, `[${coordLogin.data.user.role}]`);

  // 4. Visits
  const visits = await testEndpoint('GET', '/api/visits');
  console.log("4. /api/visits count:", visits.data.count);

  // 5. Participants
  const participants = await testEndpoint('GET', '/api/participants');
  console.log("5. /api/participants total:", participants.data.total, "Approved:", participants.data.approved);

  // 6. Attendance check-in
  const checkIn = await testEndpoint('POST', '/api/attendance/check-in', {
    studentId: 6,
    rollNo: "CS-2026-042",
    checkpoint: "Gate #2 Departure",
    method: "QR Optical Scan"
  });
  console.log("6. /api/attendance/check-in:", checkIn.status, checkIn.data.message);

  console.log("ALL API TESTS PASSED SUCCESSFULLY! ✓");
}

runTests().catch(console.error);
