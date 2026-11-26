import { useState } from "react";
import toast from "react-hot-toast";
import { downloadCsvFile } from "../../lib/exportUtils";
import {
  Search,
  Download,
  Check,
  Clock,
  CheckCircle2,
  Phone,
  Bus,
  BedDouble,
} from "lucide-react";

export default function CoordinatorParticipants() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [students, setStudents] = useState([
    { id: 1, name: "Fahad Bin Hashim", roll: "CS-2026-084", batch: "CSE-A", bus: "Bus 04", seat: "14A", room: "304", consent: "Submitted", status: "Approved", parentPhone: "+91 94471 23456", bloodGroup: "O+" },
    { id: 2, name: "Rohan Varma", roll: "CS-2026-091", batch: "CSE-A", bus: "Bus 04", seat: "14B", room: "304", consent: "Submitted", status: "Approved", parentPhone: "+91 98450 11223", bloodGroup: "B+" },
    { id: 3, name: "Aditya Nair", roll: "CS-2026-015", batch: "CSE-A", bus: "Bus 04", seat: "15A", room: "304", consent: "Submitted", status: "Approved", parentPhone: "+91 94002 99887", bloodGroup: "A+" },
    { id: 4, name: "Ananya Iyer", roll: "CS-2026-022", batch: "CSE-B", bus: "Bus 01", seat: "06A", room: "201", consent: "Submitted", status: "Approved", parentPhone: "+91 98112 33445", bloodGroup: "O+" },
    { id: 5, name: "Kavya Ramesh", roll: "CS-2026-056", batch: "CSE-B", bus: "Bus 01", seat: "06B", room: "201", consent: "Submitted", status: "Approved", parentPhone: "+91 97441 55667", bloodGroup: "AB+" },
    { id: 6, name: "Sneha Sharma", roll: "CS-2026-042", batch: "CSE-A", bus: "Unassigned", seat: "--", room: "--", consent: "Pending", status: "Pending", parentPhone: "+91 98950 66778", bloodGroup: "B+" },
    { id: 7, name: "Vignesh Rajan", roll: "CS-2026-118", batch: "CSE-B", bus: "Unassigned", seat: "--", room: "--", consent: "Pending", status: "Pending", parentPhone: "+91 94460 77889", bloodGroup: "O-" },
    { id: 8, name: "Mohammed Althaf", roll: "CS-2026-068", batch: "CSE-B", bus: "Unassigned", seat: "--", room: "--", consent: "Pending", status: "Waitlisted", parentPhone: "+91 98470 88990", bloodGroup: "A+" },
  ]);

  const updateStatus = (id, newStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
    toast.success(`Participant status updated to ${newStatus}.`);
  };

  const exportCSV = () => {
    downloadCsvFile(
      "IV2026_Participants_Roster.csv",
      ["Name", "Roll No", "Batch", "Status", "Bus", "Seat", "Room", "Parent Phone", "Blood Group"],
      students.map((s) => [s.name, s.roll, s.batch, s.status, s.bus, s.seat, s.room, s.parentPhone, s.bloodGroup])
    );
    toast.success("Exported roster to CSV safely!");
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.roll.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Enrollment & Roster</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Participant Directory & Approvals
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Approve enrollments, audit parent consent letters, and view assigned logistics.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
        >
          <Download size={16} className="text-emerald-800" />
          <span>Export Roster (CSV)</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search student or roll no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {["All", "Approved", "Pending", "Waitlisted"].map((status) => {
            const count =
              status === "All"
                ? students.length
                : students.filter((s) => s.status === status).length;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={statusFilter === status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition shrink-0 ${
                  statusFilter === status
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-white text-gray-600 ring-1 ring-gray-100 hover:bg-emerald-50 hover:text-emerald-800"
                }`}
              >
                {status} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Card View (Screens < 768px) */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.map((s) => (
          <div key={s.id} className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-extrabold text-sm text-emerald-950">{s.name}</p>
                <p className="font-mono text-xs text-gray-500">{s.roll} • {s.batch}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${
                  s.status === "Approved"
                    ? "bg-emerald-100 text-emerald-800"
                    : s.status === "Pending"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {s.status === "Approved" && <CheckCircle2 size={11} />}
                {s.status === "Pending" && <Clock size={11} />}
                {s.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
              <div className="flex items-center gap-1.5 text-gray-700">
                <Bus size={13} className="text-emerald-700" />
                <span>{s.bus} ({s.seat})</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-700">
                <BedDouble size={13} className="text-emerald-700" />
                <span>{s.room === "--" ? "Room: --" : `Room ${s.room}`}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
                <Phone size={13} className="text-gray-400" />
                <span className="truncate">{s.parentPhone} • Blood: <strong className="text-red-700">{s.bloodGroup}</strong></span>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="pt-1 flex items-center justify-end gap-2 border-t border-gray-100">
              {s.status === "Pending" ? (
                <>
                  <button
                    type="button"
                    onClick={() => updateStatus(s.id, "Waitlisted")}
                    className="flex-1 rounded-xl bg-gray-100 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200 transition"
                  >
                    Waitlist
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(s.id, "Approved")}
                    className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-emerald-800 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-900 transition"
                  >
                    <Check size={14} />
                    <span>Approve</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => updateStatus(s.id, s.status === "Approved" ? "Pending" : "Approved")}
                  className="text-xs font-bold text-emerald-800 hover:underline"
                >
                  Change Status
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop & Tablet Table (Screens >= 768px) */}
      <div className="hidden md:block overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3.5">Student Details</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Allocated Bus & Seat</th>
                <th className="px-5 py-3.5">Hotel Room</th>
                <th className="px-5 py-3.5">Parent Phone / Blood</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/60 transition">
                  <td className="px-5 py-4">
                    <p className="font-bold text-emerald-950 sm:text-sm">{s.name}</p>
                    <p className="font-mono text-[11px] text-gray-500">
                      {s.roll} • {s.batch}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        s.status === "Approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : s.status === "Pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {s.status === "Approved" && <CheckCircle2 size={12} />}
                      {s.status === "Pending" && <Clock size={12} />}
                      {s.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-bold text-emerald-950">{s.bus}</p>
                    <p className="text-[11px] text-gray-500">Seat: {s.seat}</p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-bold text-emerald-950">
                      {s.room === "--" ? "--" : `Room #${s.room}`}
                    </p>
                    <p className="text-[11px] text-gray-500">Grand Ambience</p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-800">{s.parentPhone}</p>
                    <p className="text-[11px] text-red-600 font-bold">Blood Group: {s.bloodGroup}</p>
                  </td>

                  <td className="px-5 py-4 text-right">
                    {s.status === "Pending" ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateStatus(s.id, "Approved")}
                          className="flex items-center gap-1 rounded-lg bg-emerald-800 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-900 shadow-sm"
                          title="Approve"
                        >
                          <Check size={13} />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(s.id, "Waitlisted")}
                          className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200"
                          title="Move to Waitlist"
                        >
                          Waitlist
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => updateStatus(s.id, s.status === "Approved" ? "Pending" : "Approved")}
                          className="text-xs font-semibold text-gray-500 hover:text-emerald-800 hover:underline"
                        >
                          Change Status
                        </button>
                      </div>
                    )}
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
