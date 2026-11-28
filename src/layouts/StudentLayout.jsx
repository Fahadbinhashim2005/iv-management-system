import { Suspense, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  ClipboardCheck,
  Bus,
  BedDouble,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  ArrowLeftRight,
  PhoneCall,
} from "lucide-react";
import StudentBottomNav from "../components/navigation/StudentBottomNav";
import MobileSlideDrawer from "../components/navigation/MobileSlideDrawer";
import EmergencyHelpModal from "../components/common/EmergencyHelpModal";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import { useAnnouncementAlerts } from "../features/updates/hooks/useAnnouncementAlerts";
import PortalFeedsProvider from "../context/PortalFeedsProvider";

const activeNavItems = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/itinerary", label: "My Itinerary", icon: Map },
  { to: "/student/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/student/transport", label: "Assigned Transport", icon: Bus },
  { to: "/student/accommodation", label: "Hotel & Rooms", icon: BedDouble },
  { to: "/student/announcements", label: "Notices & Updates", icon: Bell },
  { to: "/student/profile", label: "My Profile & Consent", icon: Settings },
];

export default function StudentLayout() {
  return (
    <PortalFeedsProvider
      mode="student"
      sessionsPollIntervalMs={10000}
      announcementsPollIntervalMs={5000}
      enableAlerts={true}
    >
      <StudentLayoutInner />
    </PortalFeedsProvider>
  );
}

function StudentLayoutInner() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const navigate = useNavigate();
  const { profile, user, logout } = useAuth();
  const { unreadCount } = useAnnouncementAlerts({ pollIntervalMs: 5000, enableAlerts: true });

  const studentName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
  const studentRoll = profile?.roll_no || "CS-2026-Pending";
  const studentSem = profile?.semester ? `Sem ${profile.semester}` : "Sem 5";
  const userRole = String(profile?.role || "student").toLowerCase();
  const canSwitchToStaff = userRole === "admin" || userRole === "coordinator";

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    try {
      await logout();
    } catch {
      // Ignore logout errors
    }
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#F4F8F5] text-[#163D2B]">
      {/* Skip to main content (keyboard accessibility) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:bg-emerald-800 focus:px-4 focus:py-2.5 focus:text-xs focus:font-bold focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Mobile & Tablet Top Bar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-100 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:hidden shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-expanded={mobileMenuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-emerald-900 transition hover:bg-emerald-50 active:scale-95"
            aria-label="Open navigation sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 font-extrabold text-white text-xs shadow-xs">
              IV
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-emerald-950 tracking-tight">IV Connect</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                Student
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSosOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition"
            aria-label="Emergency & Helpline Contacts"
            title="Emergency Helplines"
          >
            <PhoneCall size={17} />
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/announcements")}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
            aria-label={`Announcements${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/profile")}
            className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-xs hover:ring-2 hover:ring-emerald-500/30 transition"
            aria-label="My Profile"
          >
            <Avatar profile={profile} size="sm" />
          </button>
        </div>
      </header>

      {/* Slide-to-Access Mobile Drawer */}
      <MobileSlideDrawer
        isOpen={mobileMenuOpen}
        onOpen={() => setMobileMenuOpen(true)}
        onClose={() => setMobileMenuOpen(false)}
        ariaLabel="Student navigation drawer"
      >
        <div className="min-h-0 flex-1 flex flex-col">
          {/* Drawer Header */}
          <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
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
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close navigation menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Identity Chip */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate("/student/profile");
            }}
            className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-emerald-50/70 p-3 border border-emerald-100 text-left hover:bg-emerald-100/60 transition"
          >
            <Avatar profile={profile} size="md" />
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold text-emerald-950">{studentName}</p>
              <p className="truncate text-[11px] text-gray-500 font-mono">
                {studentRoll} • {studentSem}
              </p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav aria-label="Student mobile navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {activeNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-800"
                  }`
                }
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{label}</span>
                </span>
                {to === "/student/announcements" && unreadCount > 0 && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setSosOpen(true);
            }}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/70 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition"
          >
            <PhoneCall size={14} />
            <span>Emergency Helplines</span>
          </button>

          {canSwitchToStaff && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/coordinator/dashboard");
              }}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition"
            >
              <ArrowLeftRight size={14} />
              <span>Switch to Staff View</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </MobileSlideDrawer>

      {/* Main Grid Wrapper */}
      <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Desktop Sidebar */}
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

            <nav aria-label="Student sidebar navigation" className="flex flex-col gap-1.5 flex-1">
              {activeNavItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-xl px-4 py-3 text-xs font-semibold outline-none transition ${
                      isActive
                        ? "bg-emerald-50 font-semibold text-emerald-700 shadow-2xs"
                        : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                    }`
                  }
                >
                  <span className="flex items-center gap-3">
                    <Icon size={19} />
                    <span>{label}</span>
                  </span>
                  {to === "/student/announcements" && unreadCount > 0 && (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2.5">
            <button
              type="button"
              onClick={() => navigate("/student/profile")}
              className="flex w-full items-center gap-3 rounded-2xl bg-emerald-50/60 p-2.5 border border-emerald-100/80 text-left hover:bg-emerald-100/70 transition group"
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
            </button>

            <button
              type="button"
              onClick={() => setSosOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/60 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition"
            >
              <PhoneCall size={14} />
              <span>Emergency Helplines</span>
            </button>

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

        {/* Active Page Content */}
        <main id="main-content" tabIndex={-1} className="min-w-0 px-3 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-8 pb-28 sm:pb-28 lg:pb-10 outline-none">
          <Suspense
            fallback={
              <div className="space-y-4">
                <div className="h-9 w-48 rounded-xl bg-white motion-safe:animate-pulse" />
                <div className="h-44 rounded-3xl bg-white motion-safe:animate-pulse" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="h-28 rounded-2xl bg-white motion-safe:animate-pulse" />
                  <div className="h-28 rounded-2xl bg-white motion-safe:animate-pulse" />
                  <div className="h-28 rounded-2xl bg-white motion-safe:animate-pulse" />
                </div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Floating Bottom Nav (Mobile & Tablet) */}
      <StudentBottomNav />

      {/* Global Tour Emergency Contacts Modal */}
      <EmergencyHelpModal isOpen={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  );
}
