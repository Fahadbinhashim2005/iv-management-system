
import { Bell, LayoutDashboard, Map, ClipboardCheck, Bus, BedDouble, MessageCircle, Images, Settings } from 'lucide-react'
import StudentBottomNav from "../components/navigation/StudentBottomNav";
function StudentDashboard() {
    const tripStatus = "upcoming";
    return (
    <main className="min-h-screen bg-[#F4F8F5] text-[#163D2B]">

      <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">

        <aside className="hidden lg:flex lg:h-screen lg:flex-col bg-white p-5 shadow-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white">
              IV
            </div>

            <div>
              <h2 className="text-lg font-bold text-emerald-900">
                IV Connect
              </h2>
              <p className="text-xs text-gray-500">
                Student Portal
              </p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">

            <button className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-left font-semibold text-emerald-700 outline-none focus:outline-none">
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </button>

            <button className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-600 outline-none focus:outline-none hover:bg-emerald-50 hover:text-emerald-700">
              <Map size={20} />
              <span>My Itinerary</span>
            </button>

            <button className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-600 outline-none focus:outline-none hover:bg-emerald-50 hover:text-emerald-700">
              <ClipboardCheck size={20} />
              <span>Attendance</span>
            </button>

            <button className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-600 outline-none focus:outline-none hover:bg-emerald-50 hover:text-emerald-700">
              <Bus size={20} />
              <span>Transport</span>
            </button>

            <button className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-600 outline-none focus:outline-none hover:bg-emerald-50 hover:text-emerald-700">
              <BedDouble size={20} />
              <span>Accommodation</span>
            </button>

            <button className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-600 outline-none focus:outline-none hover:bg-emerald-50 hover:text-emerald-700">
              <MessageCircle size={20} />
              <span>Group Chat</span>
            </button>

            <button className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-600 outline-none focus:outline-none hover:bg-emerald-50 hover:text-emerald-700">
              <Images size={20} />
              <span>Gallery</span>
            </button>

            <button className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-600 outline-none focus:outline-none hover:bg-emerald-50 hover:text-emerald-700">
              <Settings size={20} />
              <span>Settings</span>
            </button>

          </nav>
        </aside>

        <div className="min-w-0 p-6 sm:p-8 lg:p-10">

            <header className="flex items-center justify-between gap-4">

                <section>
                <p className="text-sm font-medium text-emerald-700">
                    Welcome Back!
                </p>

                <h1 className="mt-1 text-lg font-bold sm:text-2xl">
                    Good morning, Fahad 👋
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Ready for your next journey?
                </p>
                </section>

                <div className="flex items-center gap-2">

                <button className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
                    <Bell size={20} className="text-emerald-600" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"></span>
                </button>

                <button className="relative flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 font-bold text-white shadow-sm">
                    F
                </button>

                </div>
            </header>

            <section className="mt-8">
                <div className="mb-5">
                    <h2 className="text-xl font-bold text-emerald-950">
                        {tripStatus === "upcoming"
                            ? "Upcoming Journey"
                            : tripStatus === "ongoing"
                            ? "Live Journey"
                            : "Journey Completed"}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                    {tripStatus === "upcoming"
                        ? "Your next adventure is getting closer!"
                        : tripStatus === "ongoing"
                        ? "Follow your journey and stay updated in real time."
                        : "Your industrial visit journey has been completed!"}
                    </p>
                </div>
                <div 
                    className="overflow-hidden rounded-2xl bg-white shadow-sm"
                    style={{
                        backgroundImage: "linear-gradient(90deg, rgba(5,35,27,0.78) 0%, rgba(5,35,27,0.58) 38%, rgba(5,35,27,0.18) 72%, rgba(5,35,27,0.05) 100%), url('/images/itinerary-bg.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}>
                    <div className="p-5 sm:p-8 text-white">

                        <div className="mb-4 flex items-center justify-between">
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {tripStatus === "upcoming"
                                ? "UPCOMING TRIP"
                                : tripStatus === "ongoing"
                                ? "LIVE NOW"
                                : "TRIP COMPLETED"}
                            </span>
                        </div>

                        <h3 className="text-2xl font-bold text-white">
                        {tripStatus === "upcoming"
                            ? "Industrial Visit 2026"
                            : tripStatus === "ongoing"
                            ? "Your Journey is Live!"
                            : "Journey Successfully Completed"}
                        </h3>

                        <p className="mt-2 text-sm text-white/90">
                        {tripStatus === "upcoming"
                            ? "An exciting learning experience awaits!"
                            : tripStatus === "ongoing"
                            ? "Explore your schedule and follow the next stops of your journey."
                            : "Thank you for being part of this amazing journey!"}
                        </p>

                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

                            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-2xl">
                                <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                                    <div className="shrink-0 rounded-lg bg-white p-3">
                                    <Map size={21} className="text-emerald-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium uppercase tracking-wider text-white/70">
                                        {tripStatus === "ongoing" ? "Current Location" : "Destination"}
                                        </p>
                                        <p className="truncate text-sm font-bold text-white sm:text-base">
                                        {tripStatus === "ongoing" ? "GIFT City" : "Ahmedabad, Gujarat"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                                    <div className="shrink-0 rounded-lg bg-white p-3">
                                    <ClipboardCheck size={21} className="text-emerald-600" />
                                    </div>
                                    <div className="min-w-0">
                                    <p className="text-xs font-medium uppercase tracking-wider text-white/70">{tripStatus === "ongoing" ? "Journey Status" : "Travel Date"}</p>
                                    <p className="truncate text-sm font-bold text-white sm:text-base">{tripStatus === "ongoing" ? "Trip in Progress" : "5 December 2026"}</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                        <div className="mt-7">
                            <button className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto">
                                {tripStatus === "upcoming"
                                ? "View Full Itinerary →"
                                : tripStatus === "ongoing"
                                    ? "View Live Itinerary →"
                                    : "View Trip Summary →"}
                            </button>
                        </div>

                    </div>
                </div>
            </section>
            

        </div>
      </div>
      <StudentBottomNav />
    </main>
  )
  
}

export default StudentDashboard
