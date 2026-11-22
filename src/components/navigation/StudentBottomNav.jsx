import { useNavigate } from "react-router-dom";
import { Bell, Map, ClipboardCheck } from "lucide-react";

function StudentBottomNav() {
    const navLinkClass = ({ isActive }) =>
    `flex flex-col items-center gap-1 transition ${
      isActive ? "font-semibold text-emerald-600" : "text-gray-500"
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
        to="/student/attendance"
        aria-label="Open QR Attendance"
        className="absolute -top-7 left-1/2 flex h-[68px] w-[68px] -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 active:scale-95"
        >
        <ScanQrCode size={30} />
        </NavLink>
    </nav>
  );
}

export default StudentBottomNav;