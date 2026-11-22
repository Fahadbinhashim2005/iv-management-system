import { useState } from "react";
import { 
  Activity, 
  Search, 
  Clock
} from "lucide-react";

export default function AdminLogs() {
  const [searchTerm, setSearchTerm] = useState("");

  const logs = [
    { id: 1, event: "Tranche 1 Disbursed", details: "₹2,50,000 transferred to Lead Coordinator Dr. Rajesh Kumar", actor: "Prof. Dr. K. Narayanan (Admin)", time: "Today, 10:45 AM", type: "Finance" },
    { id: 2, event: "Manual Attendance Override", details: "Student CS-2026-042 (Sneha Sharma) marked Present at Gate 2", actor: "Dr. Rajesh Kumar (Coordinator)", time: "Today, 10:15 AM", type: "Attendance" },
    { id: 3, event: "Itinerary Milestone Added", details: "Inserted CDAC Lab Tour slot for Day 2 11:30 AM", actor: "Prof. Anjali Menon", time: "Yesterday, 06:20 PM", type: "Itinerary" },
    { id: 4, event: "RTO Transit Permit Uploaded", details: "Police transit pass GJ-2026-9921 verified and attached", actor: "Administrative Office", time: "Yesterday, 02:00 PM", type: "Compliance" },
    { id: 5, event: "Emergency SMS Dispatched", details: "Broadcasting checklist to 4 pending students", actor: "Automated System Alert", time: "Nov 20, 09:30 AM", type: "System" },
  ];

  const filtered = logs.filter(
    (l) =>
      l.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.actor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-800">System Governance & Audit Trail</p>
        <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
          Security & Operational Audit Logs
        </h1>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Cryptographically immutable event log of all administrative authorizations, overrides, and fund movements.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Filter audit events by actor or action..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none shadow-sm"
        />
      </div>

      {/* Logs Feed */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-7 space-y-3">
        {filtered.map((log) => (
          <div
            key={log.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 hover:bg-emerald-50/20 transition text-xs"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 mt-0.5">
                <Activity size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-emerald-950 sm:text-sm">{log.event}</h4>
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold text-gray-700">
                    {log.type}
                  </span>
                </div>
                <p className="mt-0.5 text-gray-600">{log.details}</p>
                <p className="mt-1 text-[11px] text-gray-400">
                  Recorded by: <strong className="text-gray-700">{log.actor}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-gray-400 shrink-0 self-end sm:self-auto">
              <Clock size={13} />
              <span className="text-[11px]">{log.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
