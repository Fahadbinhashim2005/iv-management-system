import { NavLink } from "react-router-dom";
import { Home, Map, Bell, UserRound, ScanQrCode } from "lucide-react";
import { useActiveSessions } from "../../features/attendance/hooks/useActiveSessions";

function StudentBottomNav() {
  const { hasUnmarked } = useActiveSessions({ mode: "student", pollIntervalMs: 10000 });
  const navLinkClass = ({ isActive }) =>
    `flex flex-col items-center gap-1 transition ${
      isActive ? "font-semibold text-emerald-600" : "text-gray-500 hover:text-emerald-600"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-gray-100 bg-white px-4 pb-5 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around">
        <div className="flex flex-1 items-center justify-around">
          <NavLink to="/student/dashboard" className={navLinkClass}>
            <Home size={22} />
            <span className="text-xs">Home</span>
          </NavLink>

          <NavLink to="/student/itinerary" className={navLinkClass}>
            <Map size={22} />
            <span className="text-xs">Itinerary</span>
          </NavLink>
        </div>

        <div className="w-16 shrink-0" />

        <div className="flex flex-1 items-center justify-around">
          <NavLink to="/student/announcements" className={navLinkClass}>
            <Bell size={22} />
            <span className="text-xs">Updates</span>
          </NavLink>

          <NavLink to="/student/profile" className={navLinkClass}>
            <UserRound size={22} />
            <span className="text-xs">Profile</span>
          </NavLink>
        </div>
      </div>

      <NavLink
        to="/student/attendance/scan"
        aria-label="Scan Attendance QR"
        className={({ isActive }) =>
          `absolute -top-7 left-1/2 flex h-[68px] w-[68px] -translate-x-1/2 items-center justify-center rounded-full border-4 border-white text-white shadow-lg transition active:scale-95 ${
            isActive ? "bg-emerald-700 ring-2 ring-emerald-500" : "bg-emerald-600 hover:bg-emerald-700"
          }`
        }
      >
        <ScanQrCode size={30} />
        {hasUnmarked && (
          <span className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-400 animate-pulse" />
        )}
      </NavLink>
    </nav>
  );
}

export default StudentBottomNav;
