import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Compass,
  Users,
  GraduationCap,
  Bus,
  Coins,
  ShieldCheck,
  Activity,
  LogOut,
  ArrowLeftRight,
  Crown
} from "lucide-react";
import AdminBottomNav from "../components/navigation/AdminBottomNav";

const adminNavItems = [
  { to: "/admin/dashboard", label: "System Overview", icon: LayoutDashboard },
  { to: "/admin/visits", label: "Master Tour Registry", icon: Compass },
  { to: "/admin/coordinators", label: "Faculty & Coordinators", icon: Users },
  { to: "/admin/students", label: "Student Master Roster", icon: GraduationCap },
  { to: "/admin/logistics", label: "Fleet & Vendor Contracts", icon: Bus },
  { to: "/admin/finances", label: "Budget & Sanctions", icon: Coins },
  { to: "/admin/compliance", label: "Permits & Legal Clearance", icon: ShieldCheck },
  { to: "/admin/logs", label: "Security & Audit Logs", icon: Activity },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#F4F8F5] text-[#163D2B]">
      <div className="min-h-screen lg:grid lg:grid-cols-[295px_minmax(0,1fr)]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col justify-between bg-white p-5 shadow-sm border-r border-gray-100 overflow-y-auto">
          <div>
            {/* Brand Header */}
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 font-black text-white shadow-md ring-2 ring-amber-400/50">
                <Crown size={22} className="text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-black text-emerald-950">IV Connect</h2>
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[9px] font-black text-amber-900 uppercase tracking-wider">
                    Super Admin
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 font-semibold">Institutional Tour Dean</p>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="flex flex-col gap-1.5">
              {adminNavItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-900 to-emerald-800 text-white shadow-sm ring-1 ring-amber-400/40 translate-x-1"
                        : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-900 hover:translate-x-0.5"
                    }`
                  }
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Footer User Info & Switching */}
          <div className="mt-8 border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-emerald-50/60 border border-amber-200/60 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-600 font-black text-white text-xs shadow-sm">
                KN
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-emerald-950">Prof. Dr. K. Narayanan</p>
                <p className="truncate text-[10px] text-amber-900 font-bold">Tour Dean & Chief Admin</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold">
              <button
                type="button"
                onClick={() => navigate("/coordinator/dashboard")}
                className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white py-2 text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                title="Switch to field coordinator view"
              >
                <ArrowLeftRight size={12} />
                <span>Coord View</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/student/dashboard")}
                className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white py-2 text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                title="Preview student dashboard"
              >
                <ArrowLeftRight size={12} />
                <span>Student View</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/80 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
            >
              <LogOut size={13} />
              <span>Sign Out of Master Console</span>
            </button>
          </div>
        </aside>

        {/* Active Page Content */}
        <div className="min-w-0 p-6 pb-28 sm:p-8 sm:pb-28 lg:p-10">
          <Outlet />
        </div>
      </div>

      <AdminBottomNav />
    </main>
  );
}
