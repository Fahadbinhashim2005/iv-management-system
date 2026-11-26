import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Compass,
  Users,
  GraduationCap,
  Bus,
  BedDouble,
  Coins,
  ShieldCheck,
  Activity,
  QrCode,
  LogOut,
  ArrowLeftRight,
  Crown,
  Menu,
  X,
} from "lucide-react";
import AdminBottomNav from "../components/navigation/AdminBottomNav";
import { useAuth } from "../context/AuthContext";

const adminNavItems = [
  { to: "/admin/dashboard", label: "System Overview", icon: LayoutDashboard },
  { to: "/admin/visits", label: "Master Tour Registry", icon: Compass },
  { to: "/admin/attendance", label: "Live Attendance", icon: QrCode },
  { to: "/admin/coordinators", label: "Faculty & Coordinators", icon: Users },
  { to: "/admin/students", label: "Student Master Roster", icon: GraduationCap },
  { to: "/admin/rooms", label: "Room Allocation", icon: BedDouble },
  { to: "/admin/logistics", label: "Fleet & Vendor Contracts", icon: Bus },
  { to: "/admin/finances", label: "Budget & Sanctions", icon: Coins },
  { to: "/admin/compliance", label: "Permits & Legal Clearance", icon: ShieldCheck },
  { to: "/admin/logs", label: "Security & Audit Logs", icon: Activity },
];

export default function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <main className="min-h-screen bg-[#F4F8F5] text-[#163D2B]">
      {/* Mobile & Tablet Top Bar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-amber-200/50 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:hidden shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-emerald-950 transition hover:bg-emerald-50 active:scale-95"
            aria-label="Open master admin menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 font-black text-white text-xs shadow-xs ring-1 ring-amber-400">
              <Crown size={16} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-emerald-950 tracking-tight">IV Connect</span>
                <span className="rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[8px] font-black text-amber-900 uppercase">
                  Super Admin
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/coordinator/dashboard")}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition"
            title="Switch to coordinator view"
          >
            <ArrowLeftRight size={12} />
            <span className="hidden sm:inline">Coord</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-xs font-black text-white shadow-xs ring-1 ring-amber-300"
            aria-label="Admin profile"
          >
            KN
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-amber-300 shadow-xs ring-2 ring-amber-300">
                    <Crown size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-emerald-950">IV Connect</h2>
                    <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded-full">
                      Institutional Tour Dean
                    </span>
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
              <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-emerald-50/60 p-3 border border-amber-200">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 font-black text-white text-xs shadow-xs">
                  KN
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-emerald-950">Prof. Dr. K. Narayanan</p>
                  <p className="truncate text-[10px] text-amber-900 font-bold">Tour Dean & Chief Admin</p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-310px)]">
                {adminNavItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-emerald-900 to-emerald-800 text-white shadow-xs ring-1 ring-amber-400/40"
                          : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-950"
                      }`
                    }
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Drawer Footer Actions */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/coordinator/dashboard");
                  }}
                  className="flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-gray-700 hover:bg-gray-100 transition"
                >
                  <ArrowLeftRight size={12} />
                  <span>Coord View</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/student/dashboard");
                  }}
                  className="flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-gray-700 hover:bg-gray-100 transition"
                >
                  <ArrowLeftRight size={12} />
                  <span>Student View</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition"
              >
                <LogOut size={14} />
                <span>Sign Out of Master Console</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Wrapper */}
      <div className="min-h-screen lg:grid lg:grid-cols-[295px_minmax(0,1fr)]">
        {/* Desktop Sidebar (Persistent on screens >= 1024px) */}
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col justify-between bg-white p-5 shadow-xs border-r border-gray-100 overflow-y-auto">
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
                        ? "bg-gradient-to-r from-emerald-900 to-emerald-800 text-white shadow-xs ring-1 ring-amber-400/40 translate-x-1"
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-600 font-black text-white text-xs shadow-xs">
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
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/80 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
            >
              <LogOut size={13} />
              <span>Sign Out of Master Console</span>
            </button>
          </div>
        </aside>

        {/* Active Page Content with Responsive Mobile Padding */}
        <div className="min-w-0 px-3 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-8 pb-28 sm:pb-28 lg:pb-10">
          <Outlet />
        </div>
      </div>

      <AdminBottomNav />
    </main>
  );
}
