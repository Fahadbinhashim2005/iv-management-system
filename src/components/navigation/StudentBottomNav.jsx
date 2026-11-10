import { Home, Map, Bell, UserRound, ScanQrCode } from "lucide-react";

function StudentBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-gray-100 bg-white px-4 pb-5 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
            <div className="flex flex-1 items-center justify-around">

            <div className="flex flex-col items-center gap-1 text-emerald-600">
                <Home size={22} />
                <span className="text-xs font-semibold">Home</span>
            </div>

            <div className="flex flex-col items-center gap-1 text-gray-500">
                <Map size={22} />
                <span className="text-xs">Itinerary</span>
            </div>

            </div>

            <div className="w-16 shrink-0" />

            <div className="flex flex-1 items-center justify-around">

            <div className="flex flex-col items-center gap-1 text-gray-500">
                <Bell size={22} />
                <span className="text-xs">Updates</span>
            </div>

            <div className="flex flex-col items-center gap-1 text-gray-500">
                <UserRound size={22} />
                <span className="text-xs">Profile</span>
            </div>

            </div>
        </div>
        <button
        className="absolute -top-7 left-1/2 flex h-[68px] w-[68px] -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 active:scale-95"
        >
        <ScanQrCode size={30} />
        </button>
    </nav>
  );
}

export default StudentBottomNav;