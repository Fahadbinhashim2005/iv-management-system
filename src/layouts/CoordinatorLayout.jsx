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
  ArrowLeftRight
} from "lucide-react";
import CoordinatorBottomNav from "../components/navigation/CoordinatorBottomNav";

const navItems = [
  { to: "/coordinator/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/coordinator/visits", label: "Industrial Visits", icon: Briefcase },
  { to: "/coordinator/itinerary", label: "Itinerary Planner", icon: CalendarCheck },
  { to: "/coordinator/participants", label: "Student Roster", icon: Users },
  { to: "/coordinator/attendance", label: "Live Attendance", icon: ScanLine },
  { to: "/coordinator/transport", label: "Transport Allocation", icon: Bus },
  { to: "/coordinator/accommodation", label: "Accommodation", icon: BedDouble },
  { to: "/coordinator/announcements", label: "Broadcast Notices", icon: Bell },
  { to: "/coordinator/reports", label: "Reports & Dossier", icon: FileSpreadsheet },
];

export default function CoordinatorLayout() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#F4F8F5] text-[#163D2B]">
      <div className="min-h-screen lg:grid lg:grid-cols-[290px_minmax(0,1fr)]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col justify-between bg-white p-5 shadow-sm border-r border-gray-100 overflow-y-auto">
          <div>
            {/* Brand Header */}
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-800 font-extrabold text-white shadow-sm">
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
                        ? "bg-emerald-800 text-white shadow-sm"
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

        {/* Active Page Content */}
        <div className="min-w-0 p-6 pb-28 sm:p-8 sm:pb-28 lg:p-10">
          <Outlet />
        </div>
      </div>

      <CoordinatorBottomNav />
    </main>
  );
}
