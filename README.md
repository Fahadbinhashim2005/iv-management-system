# IV Connect — Industrial Visit Management System

> **Centralized institutional platform for planning, coordinating, and managing college industrial visits.**  
> Built with modern 3-tier Role-Based Access Control (RBAC) for **Students**, **Faculty Coordinators**, and **Chief Tour Administrators / Deans**.

---

## 👑 The 3-Tier Role Architecture

IV Connect strictly segregates operational and administrative responsibilities:

1. **🎓 Student Portal (`/student/*`)**
   - Personal tour dashboard & countdown
   - Day-by-day interactive itinerary timeline
   - Live QR attendance scanner & attendance history
   - Allocated transport vehicle (Bus #04 Volvo AC) & seat number (14A)
   - Partner hotel accommodation (Hotel Grand Ambience) & room allocation (Room #304)
   - Circulars, push notices, and emergency contacts

2. **🛡️ Coordinator Portal (`/coordinator/*`)**
   - Field operations & live tour oversight
   - Live rotating QR display & manual roll-call management for assigned visits
   - Passenger seat manifests for tour buses (Buses 01, 02, 04)
   - Real-time room occupancy rosters
   - Itinerary adjustments & instant push broadcasts to students

3. **👑 Chief Administrator Console (`/admin/*`)**
   - Institutional governance & master visit management
   - Multi-trip oversight across all departments & academic batches
   - Faculty coordinator appointments and delegation roles
   - Student roster freezing & dean bulk authorizations
   - Sanctioned budget management (₹12.8L), tranche releases, & audit ledgers
   - Statutory clearances (RTO highway permits, police transit, corporate passes)

---

## 🗺️ Application Route Hierarchy

| Role | Route | Purpose |
|---|---|---|
| **Public** | `/` | Responsive landing page with direct portal links |
| **Auth** | `/login` | 3-way Role Selector (`Student`, `Coordinator`, `Admin`) |
| **Student** | `/student/dashboard` | Main trip overview & hero card |
| **Student** | `/student/itinerary` | Multi-day schedule and timeline |
| **Student** | `/student/attendance` | Active roll-call sessions & attendance history |
| **Student** | `/student/attendance/scan` | Live camera QR scanner & `?t=` deep-link check-in |
| **Student** | `/student/transport` | Bus details, driver phone, seat number |
| **Student** | `/student/accommodation` | Room allotment & roommates |
| **Student** | `/student/announcements` | Filterable circulars feed |
| **Student** | `/student/profile` | Student profile & settings |
| **Coordinator** | `/coordinator/dashboard` | Field command center & operational metrics |
| **Coordinator** | `/coordinator/visits` | Assigned tour programs |
| **Coordinator** | `/coordinator/itinerary` | Real-time itinerary builder & broadcast |
| **Coordinator** | `/coordinator/participants` | Student roster & approval queue |
| **Coordinator** | `/coordinator/attendance` | Active & past attendance sessions for assigned visits |
| **Coordinator** | `/coordinator/attendance/:sessionId` | Live rotating QR display, roster, manual marking & CSV export |
| **Coordinator** | `/coordinator/transport` | Bus manifests & passenger seat allocations |
| **Coordinator** | `/coordinator/accommodation` | Hotel room distribution & occupancy |
| **Coordinator** | `/coordinator/announcements` | Publish circulars & SMS alerts |
| **Coordinator** | `/coordinator/reports` | Field audit reports & compliance summaries |
| **Admin** | `/admin/dashboard` | Master institutional oversight & KPIs |
| **Admin** | `/admin/visits` | Master tour program registry & approvals |
| **Admin** | `/admin/attendance` | Create & manage attendance sessions |
| **Admin** | `/admin/attendance/:sessionId` | Live rotating QR, roster, lifecycle controls & audit trail |
| **Admin** | `/admin/coordinators` | Faculty appointments & delegation roles |
| **Admin** | `/admin/students` | Master student directory & bulk authorizations |
| **Admin** | `/admin/logistics` | Commercial fleet & hotel vendor contracts |
| **Admin** | `/admin/finances` | Budget tranches, advances, & ledger |
| **Admin** | `/admin/compliance` | RTO highway passes & statutory permits |
| **Admin** | `/admin/logs` | Security audit trail & override logs |

---

## 🛠️ Tech Stack & Backend

- **Frontend:** React 19, Tailwind CSS 4, React Router v7, Lucide Icons
- **Backend API:** Node.js REST API (`server/server.js`) on port 5000 with CORS & `/api` proxy
- **Client Service:** `src/services/api.js` (with automatic graceful fallback)
- **Database Architecture:** PostgreSQL (via Supabase) with full Row Level Security (RLS)

---

## 🚀 Running Locally

```bash
# Install packages
npm install

# Run frontend dev server
npm run dev

# Run backend API server
npm run server

# Run ESLint quality checks
npm run lint

# Build production bundle
npm run build

# Run attendance unit & authorization tests
node --test server/tests/attendance.test.js
```

---

## 📱 Attendance Module (QR Roll-Call)

- **Role Flow:** Staff display, students scan. **Admin** creates an attendance session; **Admin** and assigned **Coordinators** display a live rotating HMAC-signed QR code (`v1.<sessionId>.<issuerId>.<slot>.<sig>`). **Students** scan via `/student/attendance/scan` (or their phone's native camera deep-link) to mark themselves Present.
- **Note on Legacy Pages:** The earlier simulated student QR pass and coordinator camera scanner placeholders have been replaced by this live backend-verified flow.
- **HTTPS Requirement for Camera:** Browser camera APIs (`html5-qrcode`) require **HTTPS** in production (Vercel) or `localhost` during local development.
- **Environment Variables:** Configure `APP_PUBLIC_URL`, `ATTENDANCE_DEFAULT_ROTATE_SECONDS` (default `30`), and `ATTENDANCE_SCAN_RATE_PER_MIN` (default `10`) on the backend (see `.env.example`).
- **Database Migration:** Apply `database/04_attendance.sql` in Supabase (idempotent, enables RLS on all attendance tables).
