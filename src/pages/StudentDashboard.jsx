import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../hooks/useProfile";
import { useActiveSessions } from "../features/attendance/hooks/useActiveSessions";
import { useAnnouncementAlerts } from "../features/updates/hooks/useAnnouncementAlerts";
import { roomsApi } from "../features/rooms/api/roomsApi";
import { tripConfig } from "../config/tripConfig";
import { getTripScheduleStatus } from "../utils/tripDates";
import { loadTripHelplines } from "../utils/helplines";
import Avatar from "../components/Avatar";
import {
  Bell,
  ClipboardCheck,
  Bus,
  BedDouble,
  ArrowRight,
  Clock,
  MapPin,
  ShieldCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function StudentDashboard() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { tripAssignment } = useProfile();
  const { sessions, hasActive, hasUnmarked } = useActiveSessions({
    mode: "student",
    pollIntervalMs: 15000,
  });
  const { unreadCount } = useAnnouncementAlerts({
    pollIntervalMs: 15000,
    enableAlerts: false,
  });

  const [roomSummary, setRoomSummary] = useState(null);
  const [staySummary, setStaySummary] = useState(null);
  const [dynamicCoordinators, setDynamicCoordinators] = useState([]);

  useEffect(() => {
    let active = true;
    loadTripHelplines()
      .then((list) => {
        if (!active) return;
        const facultyAndChief = list
          .filter((item) => item.fullName)
          .map((item) => item.fullName);
        setDynamicCoordinators(facultyAndChief);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    roomsApi
      .listStays()
      .then(async (stays) => {
        if (!active || !Array.isArray(stays) || stays.length === 0) return;
        const primaryStay =
          stays.find((s) => s.selection_status === "open") || stays[0];
        setStaySummary(primaryStay);
        const me = await roomsApi.getMe(primaryStay.id).catch(() => null);
        if (active && me?.myRoom) {
          setRoomSummary(me.myRoom);
        }
      })
      .catch(() => {
        // Non-blocking fallback to tripAssignment / default copy
      });
    return () => {
      active = false;
    };
  }, []);

  const studentName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Student";
  const firstName = studentName.split(" ")[0] || "Student";
  const tripSchedule = getTripScheduleStatus(
    tripConfig.trip.startDate,
    tripConfig.trip.endDate
  );
  const tripStatus = tripSchedule.status;

  const readinessItems = [
    {
      id: "phone",
      label: "Emergency contact number",
      done: Boolean(profile?.emergency_phone),
      actionLabel: "Add in Profile",
      to: "/student/profile",
    },
    {
      id: "blood",
      label: "Medical blood group",
      done: Boolean(profile?.blood_group),
      actionLabel: "Set Blood Group",
      to: "/student/profile",
    },
    {
      id: "gender",
      label: "Gender set (room eligibility)",
      done: Boolean(profile?.gender),
      actionLabel: "Set Gender",
      to: "/student/profile",
    },
    {
      id: "consent",
      label: "Trip code & guardian consent",
      done: Boolean(profile?.consent_given),
      actionLabel: "Accept Consent",
      to: "/student/profile",
    },
    {
      id: "room",
      label: "Hotel room selected",
      done: Boolean(roomSummary?.room_no || tripAssignment?.room_no),
      actionLabel: "Pick Room",
      to: "/student/accommodation",
    },
  ];
  const completedCount = readinessItems.filter((item) => item.done).length;
  const readinessPct = Math.round((completedCount / readinessItems.length) * 100);
  const isProfileIncomplete =
    !profile?.consent_given || !profile?.emergency_phone || !profile?.blood_group;

  const busId = tripAssignment?.bus_no || "";
  const busConfig = busId ? tripConfig.buses[busId] : null;
  const assignedBus = busConfig?.name || busId;
  const assignedSeat = tripAssignment?.seat_no || "";
  const hasTransportAssignment = Boolean(busId && assignedSeat);
  const assignedDriver = busConfig?.driverName || "";
  const assignedDriverPhone = busConfig?.driverPhone || "";

  const hotelLabel = tripConfig.hotel?.name
    ? [tripConfig.hotel.name, tripConfig.hotel.address].filter(Boolean).join(", ")
    : "Contact details will be shared soon";

  const coordinatorNames =
    tripConfig.coordinators.length > 0
      ? tripConfig.coordinators
      : dynamicCoordinators;

  const coordinatorsCopy =
    coordinatorNames.length > 0
      ? `${coordinatorNames.join(", ")} available during the tour.`
      : "Contact details will be shared soon.";

  const roomBadge = roomSummary?.room_no
    ? `Room ${roomSummary.room_no}`
    : tripAssignment?.room_no
    ? `Room ${tripAssignment.room_no}`
    : staySummary?.selection_status === "open"
    ? "Booking Open"
    : "Not Selected";

  const attendanceBadge = hasUnmarked
    ? "Action Needed"
    : hasActive
    ? "Marked ✓"
    : "No Active Gate";

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <section>
          <p className="text-sm font-semibold tracking-wide text-emerald-700">
            Welcome Back!
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            {getTimeGreeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Ready for your next industrial journey?
          </p>
        </section>

        <div className="hidden lg:flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/student/announcements")}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:bg-emerald-50 hover:text-emerald-700"
            aria-label={
              unreadCount > 0
                ? `View announcements (${unreadCount} unread)`
                : "View announcements"
            }
          >
            <Bell size={20} className="text-emerald-600" />
            <span aria-live="polite" className="contents">
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/student/profile")}
            className="flex items-center justify-center rounded-2xl overflow-hidden shadow-sm ring-2 ring-emerald-200 transition hover:ring-emerald-400 active:scale-95"
            aria-label="View profile"
          >
            <Avatar profile={profile} size="sm" />
          </button>
        </div>
      </header>

      {/* Profile Incomplete Notification Banner */}
      {isProfileIncomplete && (
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800">
              <AlertCircle size={22} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wide text-amber-950">
                Action Required: Profile Incomplete
              </h4>
              <p className="text-xs text-amber-800">
                Please provide your emergency phone, blood group, and trip consent before departure.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/student/profile")}
            className="inline-flex items-center justify-center gap-1.5 self-start sm:self-auto rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition active:scale-95"
          >
            <span>Complete Profile</span>
            <ArrowRight size={14} />
          </button>
        </section>
      )}

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
              "linear-gradient(90deg, rgba(5,35,27,0.88) 0%, rgba(5,35,27,0.7) 45%, rgba(5,35,27,0.35) 75%, rgba(5,35,27,0.15) 100%), url('/images/itinerary-bg.webp')",
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
                {tripSchedule.countdownLabel}
              </span>
            </div>

            <h3 className="text-2xl font-extrabold sm:text-3xl text-white">
              {tripConfig.trip.displayName}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
              {tripConfig.trip.description}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-xl">
              <div className="flex items-center gap-3.5 rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md">
                <div className="shrink-0 rounded-xl bg-white p-2.5 text-emerald-600 shadow-sm">
                  <MapPin size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
                    Destination
                  </p>
                  <p className="truncate text-sm font-bold text-white sm:text-base">
                    {tripConfig.trip.destination}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md">
                <div className="shrink-0 rounded-xl bg-white p-2.5 text-emerald-600 shadow-sm">
                  <Calendar size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
                    Travel Date
                  </p>
                  <p className="truncate text-sm font-bold text-white sm:text-base">
                    {tripConfig.trip.dateRangeLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/student/itinerary")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-600 active:scale-95"
              >
                <span>View Full Itinerary</span>
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/student/attendance")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-95"
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
        <button
          type="button"
          onClick={() => navigate("/student/attendance")}
          className="group w-full text-left rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md hover:ring-emerald-200"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
              <ClipboardCheck size={20} />
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                hasUnmarked
                  ? "bg-amber-100 text-amber-800"
                  : hasActive
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {attendanceBadge}
            </span>
          </div>
          <h4 className="mt-4 font-bold text-emerald-950">Digital Attendance</h4>
          <p className="mt-1 text-xs text-gray-500">
            {sessions.length > 0
              ? `${sessions.length} active check-in session${sessions.length === 1 ? "" : "s"} right now.`
              : "Scan QR or check live roll-call when coordinators open a gate."}
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600 transition group-hover:translate-x-1">
            <span>Open Attendance</span>
            <ArrowRight size={14} className="ml-1" />
          </div>
        </button>

        {/* Transport Card */}
        <button
          type="button"
          onClick={() => navigate("/student/transport")}
          className="group w-full text-left rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md hover:ring-emerald-200"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
              <Bus size={20} />
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
              {hasTransportAssignment ? `${assignedBus} • Seat ${assignedSeat}` : "Not assigned yet"}
            </span>
          </div>
          <h4 className="mt-4 font-bold text-emerald-950">Assigned Transport</h4>
          <p className="mt-1 text-xs text-gray-500">
            {!hasTransportAssignment
              ? "Not assigned yet — your coordinator will confirm."
              : assignedDriver
              ? `Driver: ${assignedDriver}${assignedDriverPhone ? ` (Ph: ${assignedDriverPhone})` : ""}.`
              : `${assignedBus} assigned. Driver details will be shared soon.`}
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-blue-600 transition group-hover:translate-x-1">
            <span>View Bus Details</span>
            <ArrowRight size={14} className="ml-1" />
          </div>
        </button>

        {/* Accommodation Card */}
        <button
          type="button"
          onClick={() => navigate("/student/accommodation")}
          className="group w-full text-left rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md hover:ring-emerald-200"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition group-hover:bg-purple-600 group-hover:text-white">
              <BedDouble size={20} />
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                roomSummary?.room_no
                  ? "bg-emerald-100 text-emerald-800"
                  : staySummary?.selection_status === "open"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-purple-50 text-purple-700"
              }`}
            >
              {roomBadge}
            </span>
          </div>
          <h4 className="mt-4 font-bold text-emerald-950">Accommodation</h4>
          <p className="mt-1 text-xs text-gray-500">
            {roomSummary?.room_no
              ? `${staySummary?.name || "Hotel Stay"} • ${roomSummary.type_label || "Assigned Room"} (${roomSummary.occupant_count}/${roomSummary.capacity} beds)`
              : staySummary
              ? `${staySummary.name} • Tap to select your live room on the grid.`
              : `${hotelLabel}. View room allocation & roommates.`}
          </p>
          <div className="mt-4 flex items-center text-xs font-semibold text-purple-600 transition group-hover:translate-x-1">
            <span>{roomSummary?.room_no ? "View Room & Roommates" : "Select Room"}</span>
            <ArrowRight size={14} className="ml-1" />
          </div>
        </button>
      </section>

      {/* Pre-Departure Readiness Checklist */}
      <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-emerald-950 sm:text-base">
                Pre-Departure Readiness Checklist
              </h3>
              <p className="text-xs text-gray-500">
                Complete every milestone before boarding day ({completedCount}/{readinessItems.length} done).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-2.5 w-28 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${readinessPct}%` }}
              />
            </div>
            <span className="text-xs font-extrabold text-emerald-800">{readinessPct}%</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {readinessItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.to)}
              className={`flex items-center justify-between gap-2 rounded-2xl border p-3 text-left text-xs transition ${
                item.done
                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-900"
                  : "border-amber-200 bg-amber-50/50 text-amber-950 hover:bg-amber-50"
              }`}
            >
              <span className="flex items-center gap-2 font-semibold">
                {item.done ? (
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                ) : (
                  <Circle size={16} className="shrink-0 text-amber-500" />
                )}
                <span>{item.label}</span>
              </span>
              {!item.done && (
                <span className="shrink-0 rounded-lg bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {item.actionLabel}
                </span>
              )}
            </button>
          ))}
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
              {coordinatorsCopy}
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
