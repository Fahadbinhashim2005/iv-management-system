import toast from "react-hot-toast";
import { downloadCsvFile, downloadTextFile } from "../../lib/exportUtils";
import { roomsApi } from "../../features/rooms/api/roomsApi";
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

export default function CoordinatorReports() {
  const downloadAuditCsv = () => {
    downloadCsvFile(
      "Attendance_Audit_Report.csv",
      ["Checkpoint", "Date", "Verified Students", "Total Strength", "Status"],
      [
        ["Checkpoints will populate from live attendance sessions", "-", 0, 0, "Pending"],
      ]
    );
    toast.success("Downloaded Attendance_Audit_Report.csv");
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
          <p className="text-sm font-semibold text-emerald-800">Compliance & Documentation</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Reports & Tour Dossier
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Generate attendance audit sheets, room rosters, budget logs, and printable tour dossiers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            window.print();
            toast.success("Opened print / PDF save dialog.");
          }}
          className="flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900 active:scale-95 self-start sm:self-auto"
        >
          <Printer size={16} />
          <span>Print / Save Master Dossier (PDF)</span>
        </button>
      </div>

      {/* Financial & Logistics Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Sanctioned Budget</span>
          <p className="mt-2 text-2xl font-black text-emerald-950 sm:text-3xl">₹5,40,000</p>
          <p className="mt-1 text-xs text-emerald-700 font-semibold">Sanctioned by Management (Oct 28)</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Committed Expenditure</span>
          <p className="mt-2 text-2xl font-black text-blue-900 sm:text-3xl">₹4,85,000</p>
          <p className="mt-1 text-xs text-gray-500">Buses (45%), Hotel (40%), Site Entry (15%)</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Contingency Reserve</span>
          <p className="mt-2 text-2xl font-black text-emerald-700 sm:text-3xl">₹55,000</p>
          <p className="mt-1 text-xs text-gray-500">Available emergency funds with coordinator</p>
        </div>
      </div>

      {/* Available Downloadable Reports Grid */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-7 space-y-4">
        <h3 className="font-extrabold text-emerald-950 text-base">
          Official Audit & Compliance Documents
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Document 1 */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition hover:bg-emerald-50/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">Attendance Master Audit Sheet</h4>
                <p className="text-[11px] text-gray-500">Includes all 4 checkpoint timestamps & biometric sign-offs</p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadAuditCsv}
              aria-label="Download Attendance Audit CSV"
              className="rounded-lg p-2 text-emerald-800 hover:bg-emerald-100 transition"
              title="Download CSV"
            >
              <Download size={18} />
            </button>
          </div>

          {/* Document 2 */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition hover:bg-emerald-50/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">Parent Consent Clearance Report</h4>
                <p className="text-[11px] text-gray-500">122 signed declarations verified by department mentor</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadDocumentSummary(
                  "Parent_Consent_Clearance_Summary.txt",
                  "Parent Consent Clearance Report",
                  [
                    "Verified Consents: 122 / 128 enrolled students",
                    "Pending Follow-ups: 6 students",
                    "Coordinator Sign-off: Dept. of CSE",
                  ]
                )
              }
              aria-label="Download Parent Consent Clearance Report"
              className="rounded-lg p-2 text-emerald-800 hover:bg-emerald-100 transition"
              title="Download Summary"
            >
              <Download size={18} />
            </button>
          </div>

          {/* Document 3 */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition hover:bg-emerald-50/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                <ShieldCheck size={20} />
              </div>
              <div>
                  <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">RTO Highway Transit &amp; Travel Clearance</h4>
                  <p className="text-[11px] text-gray-500">Transport &amp; route clearance summary for {tripConfig.trip.destination}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  downloadDocumentSummary(
                    "Highway_Transit_Permit_Summary.txt",
                    "RTO Highway Transit & Travel Clearance",
                    [
                      `Route: ${tripConfig.trip.route}`,
                      `Travel Window: ${tripConfig.trip.dateRangeLabel}`,
                      `Vehicles Configured: ${Object.keys(tripConfig.buses).length || "To be assigned"}`,
                    ]
                  )
                }
              aria-label="Download RTO Highway Transit Clearance"
              className="rounded-lg p-2 text-emerald-800 hover:bg-emerald-100 transition"
              title="Download Summary"
            >
              <Download size={18} />
            </button>
          </div>

          {/* Document 4 */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/60 p-4 transition hover:bg-emerald-50/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <Building size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">Industry Visit Permission Letters</h4>
                <p className="text-[11px] text-gray-500">Official security clearance and visitor passes protocol</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadDocumentSummary(
                  "Industry_Visit_Permission_Summary.txt",
                  "Industry Visit Permission Letters",
                  [
                    `Program: ${tripConfig.trip.displayName}`,
                    `Host Industries: ${tripConfig.trip.industries.join("; ")}`,
                    "Requirements: Institutional ID cards & formal dress code mandatory.",
                  ]
                )
              }
              aria-label="Download Industry Visit Permission Summary"
              className="rounded-lg p-2 text-emerald-800 hover:bg-emerald-100 transition"
              title="Download Summary"
            >
              <Download size={18} />
            </button>
          </div>

          {/* Live Room Allocation Roster Export */}
          <div className="sm:col-span-2 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 transition hover:bg-emerald-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-900 transition"
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
