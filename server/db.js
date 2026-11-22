// Shared in-memory data store for IV Connect API
export const db = {
  users: [
    {
      id: "usr_admin_01",
      email: "admin@college.edu",
      role: "admin",
      name: "Chief Administrator",
      full_name: "Chief Administrator",
      approval_status: "approved",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ],

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
