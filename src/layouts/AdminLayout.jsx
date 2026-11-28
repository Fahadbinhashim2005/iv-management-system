import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Compass,
  Map,
  Users,
  GraduationCap,
  Bus,
  BedDouble,
  Coins,
  ShieldCheck,
  Activity,
  QrCode,
  Settings,
  LogOut,
  ArrowLeftRight,
  Crown,
  Menu,
  X,
  PhoneCall,
} from "lucide-react";
import AdminBottomNav from "../components/navigation/AdminBottomNav";
import MobileSlideDrawer from "../components/navigation/MobileSlideDrawer";
import EmergencyHelpModal from "../components/common/EmergencyHelpModal";
import Avatar from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const adminNavItems = [
  { to: "/admin/dashboard", label: "System Overview", icon: LayoutDashboard },
  { to: "/admin/visits", label: "Master Tour Registry", icon: Compass },
  { to: "/admin/itineraries", label: "Itinerary Builder", icon: Map },
  { to: "/admin/attendance", label: "Live Attendance", icon: QrCode },
  { to: "/admin/coordinators", label: "Faculty & Coordinators", icon: Users },
  { to: "/admin/students", label: "Student Master Roster", icon: GraduationCap },
  { to: "/admin/rooms", label: "Room Allocation", icon: BedDouble },
  { to: "/admin/logistics", label: "Fleet & Vendor Contracts", icon: Bus },
  { to: "/admin/finances", label: "Budget & Sanctions", icon: Coins },
  { to: "/admin/compliance", label: "Permits & Legal Clearance", icon: ShieldCheck },
  { to: "/admin/logs", label: "Security & Audit Logs", icon: Activity },
  { to: "/admin/profile", label: "My Profile & Gender", icon: Settings },
];

export default function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [hasLiveDbSession, setHasLiveDbSession] = useState(true);
  const navigate = useNavigate();
  const { profile, user, session, logout } = useAuth();

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const liveToken = data?.session?.access_token;
      const fallbackToken = session?.access_token || "";
      setHasLiveDbSession(Boolean(liveToken) && !fallbackToken.startsWith("demo_token_"));
    });
    return () => {
      active = false;
    };
  }, [session]);

  const adminName =
    profile?.full_name || user?.user_metadata?.full_name || "Chief Administrator";
  const adminSub = profile?.email || "Tour Dean & Chief Admin";

  useEffect(() => {
    let cancelled = false;
    api
      .getAccessRequests()
      .then((res) => {
        if (!cancelled && typeof res?.count === "number") {
          setPendingCount(res.count);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#F4F8F5] text-[#163D2B]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:bg-emerald-900 focus:px-4 focus:py-2.5 focus:text-xs focus:font-bold focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Mobile & Tablet Top Bar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-amber-200/50 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:hidden shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-expanded={mobileMenuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-emerald-950 transition hover:bg-emerald-50 active:scale-95"
            aria-label="Open master admin navigation sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 font-black text-white text-xs shadow-xs ring-1 ring-amber-400">
              <Crown size={16} className="text-amber-300" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-emerald-950 tracking-tight">IV Connect</span>
              <span className="rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[8px] font-black text-amber-900 uppercase">
                Super Admin
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
            onClick={() => navigate("/coordinator/dashboard")}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-[11px] font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition"
            title="Switch to coordinator view"
          >
            <ArrowLeftRight size={12} />
            <span className="hidden sm:inline">Coord</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/profile")}
            className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-xs ring-1 ring-amber-300"
            aria-label="Admin profile"
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
        ariaLabel="Admin navigation drawer"
      >
        <div className="min-h-0 flex-1 flex flex-col">
          <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
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
              navigate("/admin/profile");
            }}
            className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-emerald-50/60 p-3 border border-amber-200 text-left hover:from-amber-100/70 transition"
          >
            <Avatar profile={profile} size="md" />
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-emerald-950">{adminName}</p>
              <p className="truncate text-[10px] text-amber-900 font-bold">{adminSub}</p>
            </div>
          </button>

          <nav aria-label="Admin mobile navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {adminNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-900 to-emerald-800 text-white shadow-xs ring-1 ring-amber-400/40"
                      : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-950"
                  }`
                }
              >
                <span className="flex items-center gap-3">
                  <Icon size={17} />
                  <span>{label}</span>
                </span>
                {to === "/admin/students" && pendingCount > 0 && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/coordinator/dashboard");
              }}
              className="flex min-h-[42px] items-center justify-center gap-1 rounded-xl border border-gray-200 bg-gray-50 py-2 text-gray-700 hover:bg-gray-100 transition"
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
              className="flex min-h-[42px] items-center justify-center gap-1 rounded-xl border border-gray-200 bg-gray-50 py-2 text-gray-700 hover:bg-gray-100 transition"
            >
              <ArrowLeftRight size={12} />
              <span>Student View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition"
          >
            <LogOut size={14} />
            <span>Sign Out of Master Console</span>
          </button>
        </div>
      </MobileSlideDrawer>

      {/* Main Grid Wrapper */}
      <div className="min-h-screen lg:grid lg:grid-cols-[295px_minmax(0,1fr)]">
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col justify-between bg-white p-5 shadow-xs border-r border-gray-100 overflow-y-auto">
          <div>
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

            <nav aria-label="Admin sidebar navigation" className="flex flex-col gap-1.5">
              {adminNavItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-900 to-emerald-800 text-white shadow-xs ring-1 ring-amber-400/40 translate-x-1"
                        : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-900 hover:translate-x-0.5"
                    }`
                  }
                >
                  <span className="flex items-center gap-3">
                    <Icon size={17} />
                    <span>{label}</span>
                  </span>
                  {to === "/admin/students" && pendingCount > 0 && (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                      {pendingCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-4 space-y-2.5">
            <button
              type="button"
              onClick={() => navigate("/admin/profile")}
              className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-emerald-50/60 border border-amber-200/60 p-3 text-left hover:from-amber-100/70 transition"
            >
              <Avatar profile={profile} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-emerald-950">{adminName}</p>
                <p className="truncate text-[10px] text-amber-900 font-bold">{adminSub}</p>
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

        <main id="main-content" tabIndex={-1} className="min-w-0 px-3 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-8 pb-28 sm:pb-28 lg:pb-10 outline-none">
          {isSupabaseConfigured && !hasLiveDbSession && (
            <div
              role="alert"
              className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-red-300 bg-red-50 p-4 text-xs text-red-950 shadow-xs"
            >
              <div>
                <p className="font-black text-red-900 text-sm">
                  Not Connected to Live Supabase Database
                </p>
                <p className="mt-0.5 text-red-800">
                  You are currently using an offline/cached session ({profile?.email || "fallback"}). Sign out and sign in with your real Supabase Admin account to load and edit students, coordinators, and itineraries.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 self-start sm:self-auto rounded-xl bg-red-700 px-4 py-2 text-xs font-extrabold text-white hover:bg-red-800"
              >
                Sign Out &amp; Sign In Again
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      <AdminBottomNav />
      <EmergencyHelpModal isOpen={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  );
}
