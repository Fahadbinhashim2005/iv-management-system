import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { downloadCsvFile, downloadTextFile } from "../../lib/exportUtils";
import { roomsApi } from "../../features/rooms/api/roomsApi";
import { attendanceApi } from "../../features/attendance/api/attendanceApi";
import { api } from "../../services/api";
import { tripConfig } from "../../config/tripConfig";
import {
  FileSpreadsheet,
  Download,
  FileText,
  ShieldCheck,
  Building,
  Printer,
  BedDouble,
} from "lucide-react";

function formatSessionTimestamp(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString();
}

export default function CoordinatorReports() {
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      attendanceApi.listSessions().catch(() => []),
      api.getApprovedStudents().catch(() => ({ students: [] })),
    ])
      .then(([sessionList, studentRes]) => {
        if (!active) return;
        setSessions(Array.isArray(sessionList) ? sessionList : []);
        const onlyStudents = Array.isArray(studentRes?.students)
          ? studentRes.students.filter(
              (p) => String(p.role || "student").toLowerCase() === "student"
            )
          : [];
        setStudents(onlyStudents);
      })
      .finally(() => {
        if (active) setStatsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const consentSignedCount = students.filter((s) => Boolean(s.consent_given)).length;
  const totalStudentsCount = students.length;

  const downloadAuditCsv = async () => {
    try {
      const latestSessions = await attendanceApi.listSessions();
      const rowsData = Array.isArray(latestSessions) ? latestSessions : [];
      if (rowsData.length === 0) {
        toast("No attendance sessions yet", { icon: "ℹ️" });
        return;
      }

      downloadCsvFile(
        "Attendance_Audit_Report.csv",
        ["Title", "Opened At", "Closed At", "Present", "Total", "Status"],
        rowsData.map((s) => [
          s.title || "Untitled Session",
          formatSessionTimestamp(s.starts_at || s.created_at),
          formatSessionTimestamp(s.closed_at || s.closes_at),
          s.counts?.present ?? 0,
          s.counts?.total ?? 0,
          s.effectiveStatus || s.status || "unknown",
        ])
      );
      toast.success("Downloaded Attendance_Audit_Report.csv");
    } catch (err) {
      toast.error(err?.message || "Could not export attendance audit right now.");
    }
  };

  const downloadLiveRoomCsv = async () => {
    try {
      const stays = await roomsApi.listStays();
      if (!stays?.length) {
        toast("No live stays created yet — download Room Allocation once a stay is added.", { icon: "ℹ️" });
        return;
      }
      await roomsApi.downloadCsv(stays[0].id, stays[0].name);
      toast.success(`Downloaded live room roster for ${stays[0].name}`);
    } catch (err) {
      toast.error(err?.message || "Could not export live room roster right now.");
    }
  };

  const downloadDocumentSummary = (filename, title, bodyLines) => {
    const content = [
      "IV CONNECT — OFFICIAL TOUR DOSSIER RECORD",
      `Document: ${title}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Program: ${tripConfig.trip.displayName}`,
      `Route: ${tripConfig.trip.route}`,
      `Dates: ${tripConfig.trip.dateRangeLabel}`,
      "--------------------------------------------------",
      ...bodyLines,
    ].join("\n");
    downloadTextFile(filename, content);
    toast.success(`Downloaded ${filename}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Compliance &amp; Documentation</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Reports &amp; Tour Dossier
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Generate attendance audit sheets, room rosters, consent summaries, and printable tour dossiers for {tripConfig.trip.displayName}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            window.print();
          }}
          className="no-print flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900 active:scale-95 self-start sm:self-auto"
        >
          <Printer size={16} />
          <span>Print / Save Master Dossier (PDF)</span>
        </button>
      </div>

      {/* Live Dossier Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Approved Students</span>
          <p className="mt-2 text-2xl font-black text-emerald-950 sm:text-3xl">
            {statsLoaded ? totalStudentsCount : "--"}
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-semibold">
            {tripConfig.trip.dateRangeLabel}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Parent Consents Verified</span>
          <p className="mt-2 text-2xl font-black text-blue-900 sm:text-3xl">
            {statsLoaded ? `${consentSignedCount}/${totalStudentsCount}` : "--"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {statsLoaded
              ? `${Math.max(0, totalStudentsCount - consentSignedCount)} pending consent`
              : "Syncing student records..."}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Attendance Checkpoints</span>
          <p className="mt-2 text-2xl font-black text-emerald-700 sm:text-3xl">
            {statsLoaded ? sessions.length : "--"}
          </p>
          <p className="mt-1 text-xs text-gray-500">Live &amp; closed attendance sessions</p>
        </div>
      </div>

      {/* Available Downloadable Reports Grid */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-7 space-y-4">
        <h3 className="font-extrabold text-emerald-950 text-base">
          Official Audit &amp; Compliance Documents
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Document 1 */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition hover:bg-emerald-50/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">Attendance Master Audit Sheet</h4>
                <p className="text-[11px] text-gray-500">
                  {sessions.length > 0
                    ? `Exports ${sessions.length} live/closed attendance session${sessions.length === 1 ? "" : "s"}`
                    : "Exports real session counts once attendance sessions exist"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadAuditCsv}
              aria-label="Download Attendance Audit CSV"
              className="no-print flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-emerald-800 hover:bg-emerald-100 transition"
              title="Download CSV"
            >
              <Download size={18} />
            </button>
          </div>

          {/* Document 2 */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition hover:bg-emerald-50/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">Parent Consent Clearance Report</h4>
                <p className="text-[11px] text-gray-500">
                  {statsLoaded
                    ? `${consentSignedCount} of ${totalStudentsCount} students have signed consent`
                    : "Verified student consent declarations"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadDocumentSummary(
                  "Parent_Consent_Clearance_Summary.txt",
                  "Parent Consent Clearance Report",
                  [
                    `Verified Consents: ${consentSignedCount} / ${totalStudentsCount} approved students`,
                    `Pending Follow-ups: ${Math.max(0, totalStudentsCount - consentSignedCount)} students`,
                  ]
                )
              }
              aria-label="Download Parent Consent Clearance Report"
              className="no-print flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-emerald-800 hover:bg-emerald-100 transition"
              title="Download Summary"
            >
              <Download size={18} />
            </button>
          </div>

          {/* Document 3 */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition hover:bg-emerald-50/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">Transit &amp; Route Summary</h4>
                <p className="text-[11px] text-gray-500">Route summary for {tripConfig.trip.destination}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadDocumentSummary(
                  "Travel_Route_Summary.txt",
                  "Transit & Route Summary",
                  [
                    `Route: ${tripConfig.trip.route}`,
                    `Travel Window: ${tripConfig.trip.dateRangeLabel}`,
                    `Configured Vehicles: ${Object.keys(tripConfig.buses || {}).length || "To be assigned"}`,
                  ]
                )
              }
              aria-label="Download Transit Route Summary"
              className="no-print flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-emerald-800 hover:bg-emerald-100 transition"
              title="Download Summary"
            >
              <Download size={18} />
            </button>
          </div>

          {/* Document 4 */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition hover:bg-emerald-50/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <Building size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">Industry Visit Permission Summary</h4>
                <p className="text-[11px] text-gray-500">Host companies and visitor protocol details</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadDocumentSummary(
                  "Industry_Visit_Permission_Summary.txt",
                  "Industry Visit Permission Summary",
                  [
                    `Program: ${tripConfig.trip.displayName}`,
                    `Host Industries: ${tripConfig.trip.industries.join("; ")}`,
                    "Requirements: Institutional ID cards & formal dress code mandatory.",
                  ]
                )
              }
              aria-label="Download Industry Visit Permission Summary"
              className="no-print flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-emerald-800 hover:bg-emerald-100 transition"
              title="Download Summary"
            >
              <Download size={18} />
            </button>
          </div>

          {/* Live Room Allocation Roster Export */}
          <div className="sm:col-span-2 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 transition hover:bg-emerald-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
                <BedDouble size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">Live Hotel Room Allocation Roster (CSV)</h4>
                <p className="text-[11px] text-emerald-800">Exports current room occupants, floor assignments, and unallocated participants directly from the database</p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadLiveRoomCsv}
              aria-label="Export live hotel room allocation CSV"
              className="no-print inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-900 transition"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
