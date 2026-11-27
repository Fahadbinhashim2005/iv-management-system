import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { useActiveSessions } from "../../features/attendance/hooks/useActiveSessions";
import { useAnnouncementAlerts } from "../../features/updates/hooks/useAnnouncementAlerts";
import {
  Users,
  ClipboardCheck,
  Bus,
  BedDouble,
  Plus,
  Bell,
  ArrowRight,
  MapPin,
  Calendar,
  Clock,
  ScanLine,
  AlertCircle,
  ShieldCheck,
  FileSpreadsheet,
  UserCheck,
} from "lucide-react";

export default function CoordinatorDashboard() {
  const navigate = useNavigate();
  const { sessions, hasActive } = useActiveSessions({
    mode: "staff",
    pollIntervalMs: 15000,
  });
  const { announcements } = useAnnouncementAlerts({
    pollIntervalMs: 15000,
    enableAlerts: false,
  });

  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .getApprovedStudents()
      .then((res) => {
        if (active && Array.isArray(res?.students)) {
          setPeople(res.students);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const studentsOnly = people.filter(
    (p) => String(p.role || "student").toLowerCase() === "student"
  );
  const coordinatorsOnly = people.filter(
    (p) => String(p.role || "").toLowerCase() === "coordinator"
  );

  const boysCount = studentsOnly.filter(
    (s) => (s.gender || "").toLowerCase() === "male"
  ).length;
  const girlsCount = studentsOnly.filter(
    (s) => (s.gender || "").toLowerCase() === "female"
  ).length;

  const missingContactCount = studentsOnly.filter(
    (s) => !s.guardian_name || !s.emergency_phone
  ).length;
  const missingConsentCount = studentsOnly.filter((s) => !s.consent_given).length;
  const missingGenderCount = studentsOnly.filter((s) => !s.gender).length;
  const readyStudentsCount = studentsOnly.filter(
    (s) => Boolean(s.guardian_name && s.emergency_phone && s.consent_given && s.gender)
  ).length;

  const latestNotice = announcements?.[0] || null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800">
              Department of Computer Science
            </span>
            <span className="text-xs text-gray-400">• Academic Year 2026-27</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Coordinator Command Center
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Overview of approved students, faculty leads, live attendance gates, and tour schedule.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/coordinator/visits")}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900 active:scale-95"
          >
            <Plus size={16} />
            <span>Create Visit</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/coordinator/attendance")}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 active:scale-95"
          >
            <ScanLine size={16} />
            <span>QR Scanner</span>
          </button>
        </div>
      </header>

      {/* Top 4 Live KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Students</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Users size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">
            {loading ? "--" : studentsOnly.length}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold text-emerald-700">
              {boysCount} Boys • {girlsCount} Girls
            </span>
            <button
              type="button"
              onClick={() => navigate("/coordinator/students")}
              className="font-bold text-emerald-700 hover:underline"
            >
              View Students →
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Coordinators</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <UserCheck size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">
            {loading ? "--" : coordinatorsOnly.length}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>Approved Faculty</span>
            <button
              type="button"
              onClick={() => navigate("/coordinator/students")}
              className="font-bold text-emerald-700 hover:underline"
            >
              View Staff →
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Live Attendance</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ClipboardCheck size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">
            {hasActive ? `${sessions.length} Active` : "Standby"}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span className={hasActive ? "font-semibold text-emerald-700" : "text-gray-500"}>
              {hasActive ? "Gate Open Now" : "No Active Gate"}
            </span>
            <button
              type="button"
              onClick={() => navigate("/coordinator/attendance")}
              className="font-bold text-emerald-700 hover:underline"
            >
              Open Scanner →
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Profile Readiness</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <ShieldCheck size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">
            {loading ? "--" : `${readyStudentsCount}/${studentsOnly.length}`}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>Contacts &amp; Consent</span>
            <button
              type="button"
              onClick={() => navigate("/coordinator/students")}
              className="font-bold text-emerald-700 hover:underline"
            >
              Inspect →
            </button>
          </div>
        </div>
      </section>

      {/* Active Visit & Itinerary Hero Card (Student UI Style) */}
      <section>
        <div
          className="overflow-hidden rounded-3xl bg-emerald-900 shadow-lg"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(5,35,27,0.90) 0%, rgba(5,35,27,0.72) 45%, rgba(5,35,27,0.38) 75%, rgba(5,35,27,0.18) 100%), url('/images/itinerary-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="p-6 text-white sm:p-9">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 shadow-sm backdrop-blur-sm">
                  Active Visit
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
                  IV Code: CSE-2026-AHM
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-white/85">
                <Clock size={14} />
                4 Days • Departs in 14 days
              </span>
            </div>

            <h2 className="text-2xl font-extrabold sm:text-3xl text-white">
              Industrial Visit 2026 — GIFT City &amp; Ahmedabad
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
              An immersive educational tour exploring technological infrastructure, financial tech hubs, and innovation centers in Gujarat.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-xl">
              <div className="flex items-center gap-3.5 rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md">
                <div className="shrink-0 rounded-xl bg-white p-2.5 text-emerald-700 shadow-sm">
                  <MapPin size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Destination
                  </p>
                  <p className="truncate text-sm font-bold text-white sm:text-base">
                    GIFT City &amp; Ahmedabad
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md">
                <div className="shrink-0 rounded-xl bg-white p-2.5 text-emerald-700 shadow-sm">
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

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/coordinator/itinerary")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-600 active:scale-95"
              >
                <span>View Full Itinerary</span>
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/coordinator/announcements")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-95"
              >
                <Bell size={18} />
                <span>Broadcast Notice</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Operational Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Attention & Latest Notice */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-emerald-950">Follow-up &amp; Broadcasts</h3>
              <p className="text-xs text-gray-500">
                Real-time student profile gaps and latest announcement sent.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/coordinator/students")}
              className="text-xs font-bold text-emerald-700 hover:underline shrink-0"
            >
              View Students →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => navigate("/coordinator/students")}
              className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-left transition hover:bg-amber-50"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Missing Guardian
              </p>
              <p className="mt-1 text-lg font-black text-amber-950">
                {loading ? "--" : missingContactCount}
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate("/coordinator/students")}
              className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-left transition hover:bg-amber-50"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Pending Consent
              </p>
              <p className="mt-1 text-lg font-black text-amber-950">
                {loading ? "--" : missingConsentCount}
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate("/coordinator/students")}
              className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-left transition hover:bg-amber-50"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Gender Unset
              </p>
              <p className="mt-1 text-lg font-black text-amber-950">
                {loading ? "--" : missingGenderCount}
              </p>
            </button>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 text-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-950">
                <Bell size={14} className="text-emerald-700" />
                Latest Broadcast
              </span>
              <button
                type="button"
                onClick={() => navigate("/coordinator/announcements")}
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                Manage Notices →
              </button>
            </div>
            {latestNotice ? (
              <>
                <p className="font-semibold text-gray-900">{latestNotice.title}</p>
                <p className="line-clamp-2 text-[11px] text-gray-500">{latestNotice.content}</p>
              </>
            ) : (
              <p className="text-[11px] text-gray-500">
                No notices broadcast yet. Use Broadcast Notice to alert students instantly.
              </p>
            )}
          </div>
        </section>

        {/* Right: Quick Operations */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-3">
          <div>
            <h3 className="font-bold text-emerald-950">Quick Operations</h3>
            <p className="text-xs text-gray-500">
              Jump directly to transport, room rosters, or tour compliance reports.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => navigate("/coordinator/transport")}
              className="group w-full text-left rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 transition hover:bg-emerald-50/40"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Bus size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">
                      Transport Allocation
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Bus manifests, driver contacts &amp; boarding checks
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="shrink-0 text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/coordinator/accommodation")}
              className="group w-full text-left rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 transition hover:bg-emerald-50/40"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                    <BedDouble size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">
                      Accommodation &amp; Rooms
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      View live room grids, occupants &amp; select staff room
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="shrink-0 text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/coordinator/reports")}
              className="group w-full text-left rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 transition hover:bg-emerald-50/40"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">
                      Reports &amp; Tour Dossier
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Download attendance audits, clearances &amp; CSV exports
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="shrink-0 text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition" />
              </div>
            </button>

            {missingContactCount > 0 && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                <AlertCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  <strong>{missingContactCount}</strong> student{missingContactCount === 1 ? " has" : "s have"} not completed guardian emergency contact details yet.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
