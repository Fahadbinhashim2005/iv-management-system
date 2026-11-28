import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users,
  ShieldCheck,
  Plus,
  Lock,
  Clock,
  ArrowRight,
  BedDouble,
  Map,
  QrCode,
  Edit3,
  RefreshCw,
} from "lucide-react";
import { api } from "../../services/api";
import { roomsApi } from "../../features/rooms/api/roomsApi";
import { itineraryApi } from "../../features/itinerary/api/itineraryApi";
import { attendanceApi } from "../../features/attendance/api/attendanceApi";
import { tripConfig } from "../../config/tripConfig";
import { formatShortDate } from "../../features/itinerary/lib/time";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [registrationsLocked, setRegistrationsLocked] = useState(() => {
    try {
      return localStorage.getItem("iv_admin_roster_locked") === "true";
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [students, setStudents] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [stays, setStays] = useState([]);
  const [sessions, setSessions] = useState([]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, stuRes, coordRes, itinRes, staysRes, sessRes] = await Promise.all([
        api.getAccessRequests().catch(() => ({ count: 0 })),
        api.getAdminUsers("student", "approved").catch(() => ({ users: [] })),
        api.getAdminUsers("coordinator", "approved").catch(() => ({ users: [] })),
        itineraryApi.listAll().catch(() => []),
        roomsApi.listStays().catch(() => []),
        attendanceApi.listSessions().catch(() => []),
      ]);

      setPendingRequestsCount(reqRes?.count || 0);
      setStudents(Array.isArray(stuRes?.users) ? stuRes.users : []);
      setCoordinators(Array.isArray(coordRes?.users) ? coordRes.users : []);
      setItineraries(Array.isArray(itinRes) ? itinRes : []);
      setStays(Array.isArray(staysRes) ? staysRes : []);
      setSessions(Array.isArray(sessRes) ? sessRes : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadOverview();
    }, 0);
    return () => clearTimeout(t);
  }, [loadOverview]);

  const handleToggleLock = () => {
    const next = !registrationsLocked;
    setRegistrationsLocked(next);
    try {
      localStorage.setItem("iv_admin_roster_locked", String(next));
    } catch {
      // Ignore storage write errors
    }
    toast.success(
      next
        ? "Roster lock flag saved locally. New sign-ins still require manual approval."
        : "Roster lock cleared."
    );
  };

  const totalRoomsCount = stays.reduce((acc, s) => acc + (s.summary?.roomCount || 0), 0);
  const occupiedBedsCount = stays.reduce((acc, s) => acc + (s.summary?.occupiedBeds || 0), 0);
  const totalBedsCount = stays.reduce((acc, s) => acc + (s.summary?.totalBeds || 0), 0);
  const missingGenderCount = students.filter((s) => !s.gender).length;
  const activeSessionsCount = sessions.filter((s) => s.status === "active").length;
  const activeItinerary =
    itineraries.find((i) => i.is_active && i.status === "published") ||
    itineraries.find((i) => i.status === "published") ||
    itineraries[0] ||
    null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Pending Access Requests Banner */}
      {pendingRequestsCount > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-amber-500/10 border border-amber-300 p-4 text-xs font-bold text-amber-950 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <Clock size={16} />
            </span>
            <div>
              <p className="font-black text-amber-950 text-sm">
                {pendingRequestsCount} Pending Access {pendingRequestsCount === 1 ? "Request" : "Requests"}
              </p>
              <p className="text-[11px] text-amber-800 font-medium">
                New students or coordinators have signed in and require your administrative approval.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin/students")}
            className="flex items-center gap-1 self-start sm:self-auto rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-black text-white hover:bg-amber-700 transition"
          >
            <span>Review Requests</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-black text-amber-900 uppercase tracking-wider">
              Institutional Master Deck
            </span>
            <span className="text-xs text-gray-500 font-semibold">
              • {tripConfig.trip.dateRangeLabel}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            Chief Tour Administrator Console
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            {tripConfig.trip.displayName} ({tripConfig.trip.route})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadOverview}
            disabled={loading}
            aria-label="Refresh dashboard data"
            className="flex min-h-[42px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-xs transition hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleToggleLock}
            aria-pressed={registrationsLocked}
            className={`flex min-h-[42px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition shadow-sm active:scale-95 ${
              registrationsLocked
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-emerald-900"
            }`}
          >
            <Lock size={14} />
            <span>{registrationsLocked ? "Roster Frozen" : "Freeze Rosters"}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                activeItinerary
                  ? `/admin/itineraries/${activeItinerary.id}`
                  : "/admin/itineraries"
              )
            }
            className="flex min-h-[42px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-900 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:from-emerald-700 hover:to-emerald-800 active:scale-95"
          >
            <Plus size={15} className="text-amber-300" />
            <span>{activeItinerary ? "Edit Active Itinerary" : "Open Itinerary Builder"}</span>
          </button>
        </div>
      </header>

      {/* 4 Live Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <button
          type="button"
          onClick={() => navigate("/admin/students")}
          className="text-left rounded-2xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md hover:ring-emerald-200"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
              Approved Students
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Users size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">
            {students.length}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span className={missingGenderCount > 0 ? "font-bold text-amber-700" : "font-bold text-emerald-700"}>
              {missingGenderCount > 0 ? `${missingGenderCount} missing gender` : "Roster ready"}
            </span>
            <span>{pendingRequestsCount} pending</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/admin/coordinators")}
          className="text-left rounded-2xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md hover:ring-emerald-200"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
              Coordinators
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">
            {coordinators.length}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold text-blue-700">
              {coordinators.filter((c) => (c.coordinator_type || "faculty") === "faculty").length} Faculty
            </span>
            <span>
              {coordinators.filter((c) => c.coordinator_type === "student").length} Student Leads
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/admin/rooms")}
          className="text-left rounded-2xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md hover:ring-emerald-200"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
              Room Allocation
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <BedDouble size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">
            {totalRoomsCount > 0 ? `${occupiedBedsCount}/${totalBedsCount}` : "Not set"}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span className="font-bold text-emerald-700">
              {stays.length} stay{stays.length === 1 ? "" : "s"}
            </span>
            <span>{totalRoomsCount} rooms</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/admin/attendance")}
          className="text-left rounded-2xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md hover:ring-emerald-200"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
              QR Attendance
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <QrCode size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">
            {activeSessionsCount} Live
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span className="font-bold text-emerald-700">{sessions.length} total sessions</span>
            <span>Tap to open</span>
          </div>
        </button>
      </section>

      {/* Live Itineraries Overview */}
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-emerald-950">Itineraries &amp; Live Schedule</h2>
            <p className="text-xs text-gray-500">
              Manage published itineraries, upload hero photography, and control active trip visibility.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/itineraries")}
            className="text-xs font-bold text-emerald-800 hover:underline self-start sm:self-auto"
          >
            Open Itinerary Builder →
          </button>
        </div>

        {itineraries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-6 text-center space-y-3">
            <Map size={28} className="mx-auto text-emerald-700 opacity-70" />
            <p className="text-xs font-bold text-gray-800">
              No itineraries saved in the database yet.
            </p>
            <p className="text-[11px] text-gray-500 max-w-md mx-auto">
              Create your trip in Itinerary Builder or run the SQL seed script, then publish it so students see it live.
            </p>
            <button
              type="button"
              onClick={() => navigate("/admin/itineraries")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#065F46] px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900"
            >
              <Plus size={14} /> Open Itinerary Builder
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {itineraries.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-100 bg-gray-50/70 p-4 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                        item.status === "published"
                          ? "bg-emerald-100 text-emerald-900"
                          : item.status === "archived"
                          ? "bg-gray-200 text-gray-700"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.is_active && (
                      <span className="rounded-full bg-emerald-950 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
                        Active
                      </span>
                    )}
                    <span className="text-gray-500 font-semibold">
                      {formatShortDate(item.start_date)} – {formatShortDate(item.end_date)}
                    </span>
                  </div>
                  <p className="mt-1.5 font-extrabold text-emerald-950 text-sm">{item.title}</p>
                  {item.subtitle && (
                    <p className="truncate text-[11px] text-gray-600">{item.subtitle}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/admin/itineraries/${item.id}`)}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#065F46] px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900"
                >
                  <Edit3 size={14} />
                  <span>Edit Stops &amp; Photos</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom 2-Column Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Registered Coordinators */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-emerald-950 text-sm">Registered Coordinators</h3>
            <button
              type="button"
              onClick={() => navigate("/admin/coordinators")}
              className="text-xs font-bold text-emerald-800 hover:underline"
            >
              Manage Coordinators →
            </button>
          </div>

          {coordinators.length === 0 ? (
            <p className="rounded-xl bg-gray-50 p-4 text-xs text-gray-500">
              No approved coordinators registered yet. Approve sign-in requests or appoint coordinators in{" "}
              <button
                type="button"
                onClick={() => navigate("/admin/coordinators")}
                className="font-bold text-emerald-800 underline"
              >
                Faculty &amp; Coordinators
              </button>
              .
            </p>
          ) : (
            <div className="space-y-2.5 text-xs">
              {coordinators.slice(0, 5).map((coord) => (
                <div
                  key={coord.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 p-3 gap-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-emerald-950">
                      {coord.full_name || coord.email}
                    </p>
                    <p className="truncate text-[10px] text-gray-500">
                      {coord.department || "Department not set"}
                      {coord.phone ? ` • ${coord.phone}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                    {coord.coordinator_type === "student" ? "Student Lead" : "Faculty Lead"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Planned Industries & Trip Highlights */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-emerald-950 text-sm">Scheduled Industries &amp; Destinations</h3>
            <button
              type="button"
              onClick={() => navigate("/admin/visits")}
              className="text-xs font-bold text-emerald-800 hover:underline"
            >
              Tour Registry →
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {(tripConfig.trip.industries || []).map((ind) => (
              <div key={ind} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                <span className="font-bold text-emerald-950">{ind}</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Scheduled
                </span>
              </div>
            ))}
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-[11px] text-gray-600">
              <strong className="text-gray-800">Route:</strong> {tripConfig.trip.route}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
