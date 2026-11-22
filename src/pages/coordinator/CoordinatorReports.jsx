import { useState } from "react";
import { 
  FileSpreadsheet, 
  Download, 
  FileText, 
  ShieldCheck, 
  FileCheck,
  Building,
  Printer
} from "lucide-react";

export default function CoordinatorReports() {
  const [toastMsg, setToastMsg] = useState("");

  const triggerDownload = (fileName) => {
    setToastMsg(`Preparing and downloading ${fileName}...`);
    setTimeout(() => {
      setToastMsg(`Downloaded ${fileName} successfully!`);
      setTimeout(() => setToastMsg(""), 2500);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-xs font-bold text-white shadow-xl animate-fade-in">
          <FileCheck size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Compliance & Documentation</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Reports & Tour Dossier
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Generate attendance audit sheets, budget expenditure logs, and institutional clearance files.
          </p>
        </div>

        <button
          type="button"
          onClick={() => triggerDownload("IV2026_Full_Tour_Dossier.pdf")}
          className="flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900 active:scale-95 self-start sm:self-auto"
        >
          <Printer size={16} />
          <span>Export Master Dossier (PDF)</span>
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
              onClick={() => triggerDownload("Attendance_Audit_Report.xlsx")}
              className="rounded-lg p-2 text-emerald-800 hover:bg-emerald-100 transition"
              title="Download Excel"
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
              onClick={() => triggerDownload("Parent_Consent_Forms_Batch.pdf")}
              className="rounded-lg p-2 text-emerald-800 hover:bg-emerald-100 transition"
              title="Download PDF"
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
                <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">RTO Highway Transit & Police Clearance</h4>
                <p className="text-[11px] text-gray-500">All-India tourist permit for Buses 01, 02, and 04</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => triggerDownload("Highway_Transit_Permit.pdf")}
              className="rounded-lg p-2 text-emerald-800 hover:bg-emerald-100 transition"
              title="Download PDF"
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
                <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">GIFT City Corporate Permission Letter</h4>
                <p className="text-[11px] text-gray-500">Official security clearance and visitor passes protocol</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => triggerDownload("GIFT_City_Permission_Letter.pdf")}
              className="rounded-lg p-2 text-emerald-800 hover:bg-emerald-100 transition"
              title="Download PDF"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
