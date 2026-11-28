import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  ScanLine,
  Bus,
  BedDouble,
  Bell,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
  PhoneCall,
} from "lucide-react";
import CoordinatorBottomNav from "../components/navigation/CoordinatorBottomNav";
import MobileSlideDrawer from "../components/navigation/MobileSlideDrawer";
import EmergencyHelpModal from "../components/common/EmergencyHelpModal";
import Avatar from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import AttendanceBanner from "../features/attendance/components/AttendanceBanner";
import PortalFeedsProvider from "../context/PortalFeedsProvider";

const navItems = [
  { to: "/coordinator/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/coordinator/itinerary", label: "Itinerary", icon: CalendarCheck },
  { to: "/coordinator/students", label: "Students", icon: Users },
  { to: "/coordinator/attendance", label: "Live Attendance", icon: ScanLine },
  { to: "/coordinator/transport", label: "Transport Allocation", icon: Bus },
  { to: "/coordinator/accommodation", label: "Accommodation & Rooms", icon: BedDouble },
  { to: "/coordinator/announcements", label: "Broadcast Notices", icon: Bell },
  { to: "/coordinator/reports", label: "Reports & Dossier", icon: FileSpreadsheet },
  { to: "/coordinator/profile", label: "My Profile & Gender", icon: Settings },
];

export default function CoordinatorLayout() {
  return (
    <PortalFeedsProvider
      mode="staff"
      sessionsPollIntervalMs={5000}
      announcementsPollIntervalMs={15000}
      enableAlerts={false}
    >
      <CoordinatorLayoutInner />
    </PortalFeedsProvider>
  );
}

function CoordinatorLayoutInner() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const navigate = useNavigate();
  const { profile, user, logout } = useAuth();

  const staffName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Coordinator";
  const staffSubtitle = profile?.department || profile?.email || "Faculty Coordinator";
  const isAdminUser = String(profile?.role || "").toLowerCase() === "admin";

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#F4F8F5] text-[#163D2B]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:bg-emerald-800 focus:px-4 focus:py-2.5 focus:text-xs focus:font-bold focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Mobile & Tablet Top Bar */}
      <header className="no-print sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-100 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:hidden shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-expanded={mobileMenuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-emerald-950 transition hover:bg-emerald-50 active:scale-95"
            aria-label="Open staff navigation sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 font-extrabold text-white text-xs shadow-xs">
              IV
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-emerald-950 tracking-tight">IV Connect</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-900 uppercase">
                Staff
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
          >
            <PhoneCall size={17} />
          </button>

          <button
            type="button"
            onClick={() => navigate("/coordinator/profile")}
            className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-xs"
            aria-label="My Coordinator Profile"
          >
            <Avatar profile={profile} size="sm" />
          </button>
        </div>
      </header>

      {/* Mobile Slide-to-Access Drawer */}
      <MobileSlideDrawer
        isOpen={mobileMenuOpen}
        onOpen={() => setMobileMenuOpen(true)}
        onClose={() => setMobileMenuOpen(false)}
        ariaLabel="Coordinator navigation drawer"
      >
        <div className="min-h-0 flex-1 flex flex-col">
          <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
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
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate("/coordinator/profile");
            }}
            className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-emerald-50/70 p-3 border border-emerald-100 text-left hover:bg-emerald-100/60 transition"
          >
            <Avatar profile={profile} size="md" />
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold text-emerald-950">{staffName}</p>
              <p className="truncate text-[11px] text-gray-500">{staffSubtitle}</p>
            </div>
          </button>

          <nav aria-label="Coordinator mobile navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition ${
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

        <div className="border-t border-gray-100 pt-3 space-y-2">
          {isAdminUser ? (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/admin/dashboard");
              }}
              className="flex w-full min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/70 py-2 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition"
            >
              <span>Admin Deck</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setSosOpen(true);
              }}
              className="flex w-full min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100 transition"
            >
              <PhoneCall size={13} />
              <span>Emergency Helplines</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </MobileSlideDrawer>

      {/* Main Grid Wrapper */}
      <div className="min-h-screen lg:grid lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="no-print hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col justify-between bg-white p-5 shadow-xs border-r border-gray-100 overflow-y-auto">
          <div>
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
                <p className="text-xs text-gray-500 font-medium">Faculty &amp; Coordinator</p>
              </div>
            </div>

            <nav aria-label="Coordinator sidebar navigation" className="flex flex-col gap-1.5">
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

          <div className="mt-8 border-t border-gray-100 pt-4 space-y-2.5">
            <button
              type="button"
              onClick={() => navigate("/coordinator/profile")}
              className="flex w-full items-center gap-3 rounded-xl bg-emerald-50/60 p-3 text-left hover:bg-emerald-100/70 transition"
            >
              <Avatar profile={profile} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-emerald-950">{staffName}</p>
                <p className="truncate text-[10px] text-emerald-800">{staffSubtitle}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSosOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/60 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
            >
              <PhoneCall size={13} />
              <span>Emergency Helplines</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-red-50 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 px-3 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-8 pb-28 sm:pb-28 lg:pb-10 outline-none">
          <div className="no-print">
            <AttendanceBanner basePath="/coordinator/attendance" />
          </div>
          <Outlet />
        </main>
      </div>

      <CoordinatorBottomNav />
      <EmergencyHelpModal isOpen={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  );
}
