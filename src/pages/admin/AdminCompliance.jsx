import toast from "react-hot-toast";
import { downloadTextFile } from "../../lib/exportUtils";
import {
  ShieldCheck,
  Download,
  FileText,
  FileCheck,
  Building,
  Printer,
} from "lucide-react";

const PERMITS = [
  {
    id: "RTO_Highway_Transit_Pass.txt",
    title: "RTO Highway Police Transit Pass",
    subtitle: "All-India tourist permit cleared for 3 Volvo Coaches",
    reference: "RTO-GJ-2026-9921",
    icon: ShieldCheck,
    badgeClass: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "GIFT_City_Security_Clearance.txt",
    title: "GIFT City Security Visitor Badges",
    subtitle: "Corporate security protocol clearance for 128 students",
    reference: "GIFT-SEC-842",
    icon: Building,
    badgeClass: "bg-blue-100 text-blue-800",
  },
  {
    id: "Principal_Sanction_Order.txt",
    title: "Institutional Principal Sanction Order",
    subtitle: "Official college council order authorizing absence waiver",
    reference: "PRIN-ORD-2026-14",
    icon: FileText,
    badgeClass: "bg-purple-100 text-purple-800",
  },
  {
    id: "Parent_Consent_Archive.txt",
    title: "Student Parent Medical Declarations",
    subtitle: "122 verified digital submissions archived with Dean",
    reference: "CONSENT-BATCH-CSE26",
    icon: FileCheck,
    badgeClass: "bg-amber-100 text-amber-800",
  },
];

export default function AdminCompliance() {
  const downloadPermit = (permit) => {
    const content = [
      "IV CONNECT — STATUTORY COMPLIANCE RECORD",
      `Document: ${permit.title}`,
      `Reference Code: ${permit.reference}`,
      `Summary: ${permit.subtitle}`,
      `Exported At: ${new Date().toLocaleString()}`,
      "Status: Verified & Authorized by Institutional Council",
    ].join("\n");
    downloadTextFile(permit.id, content);
    toast.success(`Downloaded clearance record: ${permit.id}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Statutory Governance</p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            Institutional Permits & Compliance
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Regulatory approvals, police transit permissions, and corporate access authorizations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            window.print();
            toast.success("Opened print / PDF save dialog.");
          }}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-900 sm:self-auto"
        >
          <Printer size={15} />
          <span>Print Compliance Register</span>
        </button>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-7 space-y-4">
        <h3 className="font-extrabold text-emerald-950 text-base">Authorized Legal Clearances</h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PERMITS.map((permit) => {
            const IconComp = permit.icon;
            return (
              <div
                key={permit.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 hover:bg-emerald-50/20 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${permit.badgeClass}`}>
                    <IconComp size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">{permit.title}</h4>
                    <p className="text-[11px] text-gray-500">{permit.subtitle}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-emerald-800">{permit.reference}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Download ${permit.title}`}
                  onClick={() => downloadPermit(permit)}
                  className="shrink-0 p-2 text-emerald-800 hover:bg-emerald-100 rounded-lg transition"
                >
                  <Download size={17} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
