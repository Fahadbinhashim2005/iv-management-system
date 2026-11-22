import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  CalendarCheck,
  Users,
  ScanLine,
  Bus,
  BedDouble,
  Bell,
  FileSpreadsheet,
  LogOut,
  ArrowLeftRight,
  Menu,
  X,
} from "lucide-react";
import CoordinatorBottomNav from "../components/navigation/CoordinatorBottomNav";

const navItems = [
  { to: "/coordinator/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/coordinator/visits", label: "Industrial Visits", icon: Briefcase },
  { to: "/coordinator/itinerary", label: "Itinerary Planner", icon: CalendarCheck },
  { to: "/coordinator/participants", label: "Student Roster", icon: Users },
  { to: "/coordinator/attendance", label: "Live Attendance Scanner", icon: ScanLine },
  { to: "/coordinator/transport", label: "Transport Allocation", icon: Bus },
  { to: "/coordinator/accommodation", label: "Accommodation & Rooms", icon: BedDouble },
  { to: "/coordinator/announcements", label: "Broadcast Notices", icon: Bell },
  { to: "/coordinator/reports", label: "Reports & Dossier", icon: FileSpreadsheet },
];

export default function CoordinatorLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#F4F8F5] text-[#163D2B]">
      {/* Mobile & Tablet Top Bar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-100 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:hidden shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-emerald-950 transition hover:bg-emerald-50 active:scale-95"
            aria-label="Open staff menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 font-extrabold text-white text-xs shadow-xs">
              IV
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-emerald-950 tracking-tight">IV Connect</span>
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-900 uppercase">
                  Staff
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/student/dashboard")}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition"
            title="Preview student perspective"
          >
            <ArrowLeftRight size={13} />
            <span className="hidden sm:inline">Student View</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/coordinator/dashboard")}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-xs font-bold text-white shadow-xs"
            aria-label="Coordinator profile"
          >
            RK
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Slide-out Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative z-10 flex h-full w-[85%] max-w-xs flex-col justify-between bg-white p-5 shadow-2xl transition-transform duration-300">
            <div>
              {/* Drawer Header */}
              <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 font-extrabold text-white">
                    IV
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-emerald-950">IV Connect</h2>
                    <span className="text-[11px] font-bold text-emerald-800">Faculty Coordinator</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* User Identity Chip */}
              <div className="mb-5 flex items-center gap-3 rounded-2xl bg-emerald-50/70 p-3 border border-emerald-100">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 font-black text-white text-xs">
                  RK
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-emerald-950">Dr. Rajesh Kumar</p>
                  <p className="truncate text-[11px] text-gray-500">HOD Computer Science</p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-290px)]">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition ${
                        isActive
                          ? "bg-emerald-800 text-white shadow-xs"
                          : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-900"
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Drawer Footer Actions */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/student/dashboard");
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-gray-700 hover:bg-gray-100 transition"
                >
                  <ArrowLeftRight size={13} />
                  <span>Student View</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/admin/dashboard");
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/70 py-2.5 text-amber-900 hover:bg-amber-100 transition"
                >
                  <span>Admin Deck</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/login");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Wrapper */}
      <div className="min-h-screen lg:grid lg:grid-cols-[290px_minmax(0,1fr)]">
        {/* Desktop Sidebar (Persistent on screens >= 1024px) */}
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col justify-between bg-white p-5 shadow-xs border-r border-gray-100 overflow-y-auto">
          <div>
            {/* Brand Header */}
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-800 font-extrabold text-white shadow-xs">
                IV
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-bold text-emerald-950">IV Connect</h2>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-900 uppercase">
                    Staff
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium">Faculty & Coordinator</p>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="flex flex-col gap-1.5">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition ${
                      isActive
                        ? "bg-emerald-800 text-white shadow-xs"
                        : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-800"
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Footer User Info & Switching */}
          <div className="mt-8 border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50/60 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 font-bold text-white text-xs">
                RK
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-emerald-950">Dr. Rajesh Kumar</p>
                <p className="truncate text-[10px] text-emerald-800">HOD Computer Science</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => navigate("/student/dashboard")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2 text-gray-700 transition hover:bg-gray-50 hover:text-emerald-800"
                title="Preview what students see"
              >
                <ArrowLeftRight size={13} />
                <span>Student View</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-red-50 py-2 text-red-700 transition hover:bg-red-100"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Active Page Content with Responsive Mobile Padding */}
        <div className="min-w-0 px-3 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-8 pb-28 sm:pb-28 lg:pb-10">
          <Outlet />
        </div>
      </div>

      <CoordinatorBottomNav />
    </main>
  );
}
