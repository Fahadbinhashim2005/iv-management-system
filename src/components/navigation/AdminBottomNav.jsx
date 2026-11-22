import { NavLink } from "react-router-dom";
import { LayoutDashboard, Compass, Users, Coins, ShieldAlert } from "lucide-react";

function AdminBottomNav() {
  const navLinkClass = ({ isActive }) =>
    `flex flex-col items-center gap-1 transition ${
      isActive ? "font-bold text-amber-600" : "text-gray-500 hover:text-amber-600"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-gray-100 bg-white px-4 pb-5 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around">
        <div className="flex flex-1 items-center justify-around">
          <NavLink to="/admin/dashboard" className={navLinkClass}>
            <LayoutDashboard size={20} />
            <span className="text-[10px]">Overview</span>
          </NavLink>

          <NavLink to="/admin/visits" className={navLinkClass}>
            <Compass size={20} />
            <span className="text-[10px]">Visits</span>
          </NavLink>
        </div>

        <div className="w-16 shrink-0" />

        <div className="flex flex-1 items-center justify-around">
          <NavLink to="/admin/coordinators" className={navLinkClass}>
            <Users size={20} />
            <span className="text-[10px]">Faculty</span>
          </NavLink>

          <NavLink to="/admin/finances" className={navLinkClass}>
            <Coins size={20} />
            <span className="text-[10px]">Budgets</span>
          </NavLink>
        </div>
      </div>

      <NavLink
        to="/admin/compliance"
        aria-label="Compliance & Permits"
        className={({ isActive }) =>
          `absolute -top-7 left-1/2 flex h-[64px] w-[64px] -translate-x-1/2 items-center justify-center rounded-full border-4 border-white text-white shadow-lg transition active:scale-95 ${
            isActive ? "bg-amber-600 ring-2 ring-amber-400" : "bg-emerald-900 hover:bg-emerald-800"
          }`
        }
      >
        <ShieldAlert size={28} />
      </NavLink>
    </nav>
  );
}

export default AdminBottomNav;
