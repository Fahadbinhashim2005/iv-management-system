import { useNavigate } from "react-router-dom";
import { 
  Bell, 
  ClipboardCheck, 
  Bus, 
  BedDouble, 
  ArrowRight, 
  Clock, 
  MapPin, 
  ShieldCheck,
  Calendar
} from "lucide-react";

function StudentDashboard() {
  const navigate = useNavigate();
  const tripStatus = "upcoming";

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <section>
          <p className="text-sm font-semibold tracking-wide text-emerald-700">
            Welcome Back!
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Good morning, Fahad 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Ready for your next industrial journey?
          </p>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/student/announcements")}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:bg-emerald-50 hover:text-emerald-700"
            aria-label="View announcements"
          >
            <Bell size={20} className="text-emerald-600" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/profile")}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-sm ring-2 ring-emerald-200 transition hover:bg-emerald-700 active:scale-95"
            aria-label="View profile"
          >
            F
          </button>
        </div>
      </header>

      {/* Main Journey Hero Card */}
      <section>
        <div className="mb-4">
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
          className="overflow-hidden rounded-3xl bg-emerald-900 shadow-lg"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(5,35,27,0.88) 0%, rgba(5,35,27,0.7) 45%, rgba(5,35,27,0.35) 75%, rgba(5,35,27,0.15) 100%), url('/images/itinerary-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="p-6 text-white sm:p-9">
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-emerald-50/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 shadow-sm backdrop-blur-sm">
                {tripStatus === "upcoming"
                  ? "Upcoming Trip"
                  : tripStatus === "ongoing"
                  ? "Live Now"
                  : "Trip Completed"}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-white/80">
                <Clock size={14} />
                Departs in 14 days
              </span>
            </div>

            <h3 className="text-2xl font-extrabold sm:text-3xl text-white">
              Industrial Visit 2026
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
              An immersive educational tour exploring technological infrastructure, financial tech hubs, and innovation centers in Gujarat.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-xl">
              <div className="flex items-center gap-3.5 rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md">
                <div className="shrink-0 rounded-xl bg-white p-2.5 text-emerald-600 shadow-sm">
                  <MapPin size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Destination
                  </p>
                  <p className="truncate text-sm font-bold text-white sm:text-base">
                    GIFT City & Ahmedabad
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md">
                <div className="shrink-0 rounded-xl bg-white p-2.5 text-emerald-600 shadow-sm">
                  <Calendar size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Travel Date
                  </p>
                  <p className="truncate text-sm font-bold text-white sm:text-base">
                    5 - 8 December 2026
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/student/itinerary")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-600 active:scale-95"
              >
                <span>View Full Itinerary</span>
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/student/attendance")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-95"
              >
                <ClipboardCheck size={18} />
                <span>Check-in Status</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Summary Grid */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Attendance Card */}
        <div 
          onClick={() => navigate("/student/attendance")}
          className="group cursor-pointer rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md hover:ring-emerald-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
              <ClipboardCheck size={20} />
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
              Pending Next Gate
            </span>
          </div>
          <h4 className="mt-4 font-bold text-emerald-950">Digital Attendance</h4>
          <p className="mt-1 text-xs text-gray-500">
            Next scan at Departure Gate #2 on Dec 5, 06:00 AM.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600 transition group-hover:translate-x-1">
            <span>Scan QR Code</span>
            <ArrowRight size={14} className="ml-1" />
          </div>
        </div>

        {/* Transport Card */}
        <div 
          onClick={() => navigate("/student/transport")}
          className="group cursor-pointer rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md hover:ring-emerald-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
              <Bus size={20} />
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
              Bus #04 • Seat 14A
            </span>
          </div>
          <h4 className="mt-4 font-bold text-emerald-950">Assigned Transport</h4>
          <p className="mt-1 text-xs text-gray-500">
            Volvo Multi-Axle AC. Driver: Mr. Suresh (Ph: +91 98765 43210).
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-blue-600 transition group-hover:translate-x-1">
            <span>View Bus Details</span>
            <ArrowRight size={14} className="ml-1" />
          </div>
        </div>

        {/* Accommodation Card */}
        <div 
          onClick={() => navigate("/student/accommodation")}
          className="group cursor-pointer rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md hover:ring-emerald-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition group-hover:bg-purple-600 group-hover:text-white">
              <BedDouble size={20} />
            </div>
            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700">
              Room 304
            </span>
          </div>
          <h4 className="mt-4 font-bold text-emerald-950">Accommodation</h4>
          <p className="mt-1 text-xs text-gray-500">
            Hotel Grand Ambience, Ashram Road. Check-in on Dec 5 at 02:00 PM.
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-purple-600 transition group-hover:translate-x-1">
            <span>View Room & Roommates</span>
            <ArrowRight size={14} className="ml-1" />
          </div>
        </div>
      </section>

      {/* Coordinator & Support Notice */}
      <section className="flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h5 className="font-bold text-emerald-950">
              Faculty Coordinators On Duty
            </h5>
            <p className="text-xs text-emerald-800">
              Dr. Rajesh Kumar (HOD CS) & Prof. Anjali Menon are available 24/7 during the tour.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/student/announcements")}
          className="self-start rounded-xl bg-white px-4 py-2 text-xs font-bold text-emerald-800 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-100 sm:self-auto"
        >
          View Important Notices
        </button>
      </section>
    </div>
  );
}

export default StudentDashboard;
