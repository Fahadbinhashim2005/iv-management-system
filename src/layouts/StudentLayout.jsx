import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
  Menu,
  X,
  LogOut,
  ArrowLeftRight,
} from "lucide-react";
import StudentBottomNav from "../components/navigation/StudentBottomNav";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import { useAnnouncementAlerts } from "../features/updates/hooks/useAnnouncementAlerts";

const activeNavItems = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/itinerary", label: "My Itinerary", icon: Map },
  { to: "/student/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/student/transport", label: "Assigned Transport", icon: Bus },
  { to: "/student/accommodation", label: "Hotel & Rooms", icon: BedDouble },
  { to: "/student/announcements", label: "Notices & Updates", icon: Bell },
  { to: "/student/profile", label: "My Profile & Consent", icon: Settings },
];

const upcomingNavItems = [
  { label: "Group Chat", icon: MessageCircle },
  { label: "Tour Gallery", icon: Images },
];

export default function StudentLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { profile, user, logout } = useAuth();
  useAnnouncementAlerts({ pollIntervalMs: 5000, enableAlerts: true });

  const studentName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Student";
  const studentRoll = profile?.roll_no || "CS-2026-Pending";
  const studentSem = profile?.semester ? `Sem ${profile.semester}` : "Sem 5";

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore logout errors
    }
    navigate("/login");
  };

  return (
    <main className="min-h-screen bg-[#F4F8F5] text-[#163D2B]">
      {/* Mobile & Tablet Top Bar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-100 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:hidden shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-emerald-900 transition hover:bg-emerald-50 active:scale-95"
            aria-label="Open mobile menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 font-extrabold text-white text-xs shadow-xs">
              IV
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-emerald-950 tracking-tight">IV Connect</span>
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                  Student
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/student/announcements")}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
            aria-label="Announcements"
          >
            <Bell size={18} />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-600" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/profile")}
            className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shadow-xs hover:ring-2 hover:ring-emerald-500/30 transition"
            aria-label="My Profile"
          >
            <Avatar profile={profile} size="sm" />
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Slide-out Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative z-10 flex h-full w-[85%] max-w-xs flex-col justify-between bg-white p-5 shadow-2xl transition-transform duration-300">
            <div>
              {/* Drawer Header */}
              <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 font-extrabold text-white">
                    IV
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-emerald-950">IV Connect</h2>
                    <span className="text-[11px] font-semibold text-emerald-700">Student Portal</span>
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
              <div 
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/student/profile");
                }}
                className="mb-5 flex items-center gap-3 rounded-2xl bg-emerald-50/70 p-3 border border-emerald-100 cursor-pointer hover:bg-emerald-100/60 transition"
              >
                <Avatar profile={profile} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-emerald-950">{studentName}</p>
                  <p className="truncate text-[11px] text-gray-500 font-mono">{studentRoll} • {studentSem}</p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                {activeNavItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-800"
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </NavLink>
                ))}

                {/* Deferred v2 items */}
                {upcomingNavItems.map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-xl px-3.5 py-2 text-xs text-gray-400"
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={18} />
                      <span>{label}</span>
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-500">
                      Soon
                    </span>
                  </div>
                ))}
              </nav>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/coordinator/dashboard");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition"
              >
                <ArrowLeftRight size={14} />
                <span>Switch to Staff View</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
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
      <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Desktop Sidebar (Persistent on screens >= 1024px) */}
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col bg-white p-5 shadow-xs border-r border-gray-100 justify-between">
          <div>
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-xs">
                IV
              </div>
              <div>
                <h2 className="text-lg font-bold text-emerald-900">IV Connect</h2>
                <p className="text-xs text-gray-500">Student Portal</p>
              </div>
            </div>

            <nav className="flex flex-col gap-1.5 flex-1">
              {activeNavItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold outline-none transition ${
                      isActive
                        ? "bg-emerald-50 font-semibold text-emerald-700 shadow-2xs"
                        : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                    }`
                  }
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </NavLink>
              ))}

              {upcomingNavItems.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  className="flex cursor-not-allowed items-center justify-between rounded-xl px-4 py-2.5 text-left text-xs text-gray-400"
                >
                  <span className="flex items-center gap-3">
                    <Icon size={18} />
                    <span>{label}</span>
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
                    Soon
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            {/* Desktop User Profile Identity Tile */}
            <div
              onClick={() => navigate("/student/profile")}
              className="flex items-center gap-3 rounded-2xl bg-emerald-50/60 p-2.5 border border-emerald-100/80 cursor-pointer hover:bg-emerald-100/70 transition group"
              title="View & Edit My Profile"
            >
              <Avatar profile={profile} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-emerald-950 group-hover:text-emerald-800 transition">
                  {studentName}
                </p>
                <p className="truncate text-[10px] text-gray-500 font-mono">
                  {studentRoll} • {studentSem}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition active:scale-95"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Active Page Content with Responsive Padding */}
        <div className="min-w-0 px-3 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-8 pb-28 sm:pb-28 lg:pb-10">
          <Outlet />
        </div>
      </div>

      {/* Floating Bottom Nav (Mobile & Tablet) */}
      <StudentBottomNav />
    </main>
  );
}
