import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  ClipboardCheck,
  Bus,
  BedDouble,
  Bell,
  MessageCircle,
  Images,
  Settings,
} from "lucide-react";
import StudentBottomNav from "../components/navigation/StudentBottomNav";

const activeNavItems = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/itinerary", label: "My Itinerary", icon: Map },
  { to: "/student/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/student/transport", label: "Transport", icon: Bus },
  { to: "/student/accommodation", label: "Accommodation", icon: BedDouble },
  { to: "/student/announcements", label: "Updates", icon: Bell },
  { to: "/student/profile", label: "Settings", icon: Settings },
];

const upcomingNavItems = [
  { label: "Group Chat", icon: MessageCircle },
  { label: "Gallery", icon: Images },
];

export default function StudentLayout() {
  return (
    <main className="min-h-screen bg-[#F4F8F5] text-[#163D2B]">
      <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col bg-white p-5 shadow-sm border-r border-gray-100">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-sm">
              IV
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-900">IV Connect</h2>
              <p className="text-xs text-gray-500">Student Portal</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2 flex-1">
            {activeNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-left outline-none transition ${
                    isActive
                      ? "bg-emerald-50 font-semibold text-emerald-700"
                      : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }`
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}

            {/* Deferred v2 items kept visible but clearly disabled */}
            {upcomingNavItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                disabled
                className="flex cursor-not-allowed items-center justify-between rounded-xl px-4 py-3 text-left text-gray-400"
              >
                <span className="flex items-center gap-3">
                  <Icon size={20} />
                  <span>{label}</span>
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
                  Soon
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Active Page Content */}
        <div className="min-w-0 p-6 pb-28 sm:p-8 sm:pb-28 lg:p-10">
          <Outlet />
        </div>
      </div>

      <StudentBottomNav />
    </main>
  );
}
