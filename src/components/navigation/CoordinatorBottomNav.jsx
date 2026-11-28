import { NavLink } from "react-router-dom";
import { LayoutDashboard, CalendarCheck, QrCode, Users, Menu } from "lucide-react";
import { useActiveSessions } from "../../features/attendance/hooks/useActiveSessions";

function CoordinatorBottomNav() {
  const { hasActive } = useActiveSessions({ mode: "staff", pollIntervalMs: 10000 });
  const navLinkClass = ({ isActive }) =>
    `flex flex-col items-center gap-1 transition ${
      isActive ? "font-semibold text-emerald-700" : "text-gray-500 hover:text-emerald-700"
    }`;

  return (
    <nav className="no-print fixed bottom-0 left-0 z-50 w-full border-t border-gray-100 bg-white px-4 pb-5 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around">
        <div className="flex flex-1 items-center justify-around">
          <NavLink to="/coordinator/dashboard" className={navLinkClass}>
            <LayoutDashboard size={22} />
            <span className="text-[11px]">Dashboard</span>
          </NavLink>

          <NavLink to="/coordinator/itinerary" className={navLinkClass}>
            <CalendarCheck size={22} />
            <span className="text-[11px]">Itinerary</span>
          </NavLink>
        </div>

        <div className="w-16 shrink-0" />

        <div className="flex flex-1 items-center justify-around">
          <NavLink to="/coordinator/students" className={navLinkClass}>
            <Users size={22} />
            <span className="text-[11px]">Students</span>
          </NavLink>

          <NavLink to="/coordinator/reports" className={navLinkClass}>
            <Menu size={22} />
            <span className="text-[11px]">Reports</span>
          </NavLink>
        </div>
      </div>

      <NavLink
        to="/coordinator/attendance"
        aria-label="Live Attendance"
        className={({ isActive }) =>
          `absolute -top-7 left-1/2 flex h-[68px] w-[68px] -translate-x-1/2 items-center justify-center rounded-full border-4 border-white text-white shadow-lg transition active:scale-95 ${
            isActive ? "bg-emerald-800 ring-2 ring-emerald-500" : "bg-emerald-700 hover:bg-emerald-800"
          }`
        }
      >
        <QrCode size={28} />
        {hasActive && (
          <span className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-300 animate-pulse" />
        )}
      </NavLink>
    </nav>
  );
}

export default CoordinatorBottomNav;
