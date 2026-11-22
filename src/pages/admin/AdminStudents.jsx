import { useState } from "react";
import { 
  Search, 
  Check, 
  CheckCircle2, 
  Clock, 
  FileCheck
} from "lucide-react";

export default function AdminStudents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const [students, setStudents] = useState([
    { id: 1, name: "Fahad Bin Hashim", roll: "CS-2026-084", batch: "Batch 2023-27", tour: "IV-2026-01 (Ahmedabad)", status: "Approved", parentConsent: "Verified", feeCleared: true },
    { id: 2, name: "Rohan Varma", roll: "CS-2026-091", batch: "Batch 2023-27", tour: "IV-2026-01 (Ahmedabad)", status: "Approved", parentConsent: "Verified", feeCleared: true },
    { id: 3, name: "Aditya Nair", roll: "CS-2026-015", batch: "Batch 2023-27", tour: "IV-2026-01 (Ahmedabad)", status: "Approved", parentConsent: "Verified", feeCleared: true },
    { id: 4, name: "Sneha Sharma", roll: "CS-2026-042", batch: "Batch 2023-27", tour: "IV-2026-01 (Ahmedabad)", status: "Pending Dean Approval", parentConsent: "Submitted", feeCleared: true },
    { id: 5, name: "Vignesh Rajan", roll: "CS-2026-118", batch: "Batch 2023-27", tour: "IV-2026-01 (Ahmedabad)", status: "Pending Dean Approval", parentConsent: "Submitted", feeCleared: true },
    { id: 6, name: "Mohammed Althaf", roll: "CS-2026-068", batch: "Batch 2023-27", tour: "IV-2026-01 (Ahmedabad)", status: "Waitlisted", parentConsent: "Missing", feeCleared: false },
  ]);

  const handleBulkApprove = () => {
    setStudents((prev) =>
      prev.map((s) => ({ ...s, status: "Approved" }))
    );
    setToastMsg("All pending participant applications approved by Dean.");
    setTimeout(() => setToastMsg(""), 3000);
  };

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.roll.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.batch.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Enrollment Governance</p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            Master Student Directory & Approvals
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Institutional participant authorizations, statutory parent consent tracking, and fee clearances.
          </p>
        </div>

        <button
          type="button"
          onClick={handleBulkApprove}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-900 active:scale-95 self-start sm:self-auto"
        >
          <Check size={16} />
          <span>Bulk Authorize All Pending</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by student name or roll number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3.5">Student Details</th>
                <th className="px-5 py-3.5">Assigned Visit</th>
                <th className="px-5 py-3.5">Dean Approval Status</th>
                <th className="px-5 py-3.5">Parent Consent</th>
                <th className="px-5 py-3.5">Fee Clearance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/60 transition">
                  <td className="px-5 py-4">
                    <p className="font-bold text-emerald-950 text-sm">{s.name}</p>
                    <p className="font-mono text-[11px] text-gray-500">
                      {s.roll} • {s.batch}
                    </p>
                  </td>

                  <td className="px-5 py-4 font-semibold text-gray-800">{s.tour}</td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        s.status === "Approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {s.status === "Approved" ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {s.status}
                    </span>
                  </td>

                  <td className="px-5 py-4 font-semibold text-gray-700">{s.parentConsent}</td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        s.feeCleared ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                      }`}
                    >
                      {s.feeCleared ? "Paid & Verified" : "Pending Clearance"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
