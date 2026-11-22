# IV Connect — Industrial Visit Management System

> **Centralized institutional platform for planning, coordinating, and managing college industrial visits.**  
> Built with modern 3-tier Role-Based Access Control (RBAC) for **Students**, **Faculty Coordinators**, and **Chief Tour Administrators / Deans**.

---

## 👑 The 3-Tier Role Architecture

IV Connect strictly segregates operational and administrative responsibilities:

1. **🎓 Student Portal (`/student/*`)**
   - Personal tour dashboard & countdown
   - Day-by-day interactive itinerary timeline
   - Cryptographically verifiable digital QR attendance pass
   - Allocated transport vehicle (Bus #04 Volvo AC) & seat number (14A)
   - Partner hotel accommodation (Hotel Grand Ambience) & room allocation (Room #304)
   - Circulars, push notices, and emergency contacts

2. **🛡️ Coordinator Portal (`/coordinator/*`)**
   - Field operations & live tour oversight
   - Optical camera QR scanner for student attendance verification
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
| **Student** | `/student/attendance` | Personal digital QR check-in pass |
| **Student** | `/student/transport` | Bus details, driver phone, seat number |
| **Student** | `/student/accommodation` | Room allotment & roommates |
| **Student** | `/student/announcements` | Filterable circulars feed |
| **Student** | `/student/profile` | Student profile & settings |
| **Coordinator** | `/coordinator/dashboard` | Field command center & operational metrics |
| **Coordinator** | `/coordinator/visits` | Assigned tour programs |
| **Coordinator** | `/coordinator/itinerary` | Real-time itinerary builder & broadcast |
| **Coordinator** | `/coordinator/participants` | Student roster & approval queue |
| **Coordinator** | `/coordinator/attendance` | Camera QR scanner & roll-call reconciliation |
| **Coordinator** | `/coordinator/transport` | Bus manifests & passenger seat allocations |
| **Coordinator** | `/coordinator/accommodation` | Hotel room distribution & occupancy |
| **Coordinator** | `/coordinator/announcements` | Publish circulars & SMS alerts |
| **Coordinator** | `/coordinator/reports` | Field audit reports & compliance summaries |
| **Admin** | `/admin/dashboard` | Master institutional oversight & KPIs |
| **Admin** | `/admin/visits` | Master tour program registry & approvals |
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
```
