import { useState } from "react";
import { 
  ShieldCheck, 
  Download, 
  FileText, 
  FileCheck,
  Building
} from "lucide-react";

export default function AdminCompliance() {
  const [toastMsg, setToastMsg] = useState("");

  const downloadPermit = (name) => {
    setToastMsg(`Exporting authorized statutory clearance: ${name}`);
    setTimeout(() => setToastMsg(""), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-950 border border-amber-400 px-4 py-3 text-xs font-bold text-white shadow-2xl">
          <FileCheck size={16} className="text-amber-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-800">Statutory Governance</p>
        <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
          Institutional Permits & Compliance
        </h1>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Regulatory approvals, police transit permissions, and corporate access authorizations.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-7 space-y-4">
        <h3 className="font-extrabold text-emerald-950 text-base">Authorized Legal Clearances</h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Item 1 */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/70 p-4 hover:bg-emerald-50/20 transition">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">RTO Highway Police Transit Pass</h4>
                <p className="text-[11px] text-gray-500">All-India tourist permit cleared for 3 Volvo Coaches</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => downloadPermit("RTO_Highway_Transit_Pass.pdf")}
              className="p-2 text-emerald-800 hover:bg-emerald-100 rounded-lg transition"
            >
              <Download size={17} />
            </button>
          </div>

          {/* Item 2 */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/70 p-4 hover:bg-emerald-50/20 transition">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                <Building size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">GIFT City Security Visitor Badges</h4>
                <p className="text-[11px] text-gray-500">Corporate security protocol clearance for 128 students</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => downloadPermit("GIFT_City_Security_Clearance.pdf")}
              className="p-2 text-emerald-800 hover:bg-emerald-100 rounded-lg transition"
            >
              <Download size={17} />
            </button>
          </div>

          {/* Item 3 */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/70 p-4 hover:bg-emerald-50/20 transition">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">Institutional Principal Sanction Order</h4>
                <p className="text-[11px] text-gray-500">Official college council order authorizing absence waiver</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => downloadPermit("Principal_Sanction_Order.pdf")}
              className="p-2 text-emerald-800 hover:bg-emerald-100 rounded-lg transition"
            >
              <Download size={17} />
            </button>
          </div>

          {/* Item 4 */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/70 p-4 hover:bg-emerald-50/20 transition">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <FileCheck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">Student Parent Medical Declarations</h4>
                <p className="text-[11px] text-gray-500">122 verified digital submissions archived with Dean</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => downloadPermit("Parent_Consent_Archive.pdf")}
              className="p-2 text-emerald-800 hover:bg-emerald-100 rounded-lg transition"
            >
              <Download size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
