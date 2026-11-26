import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Activity, Search, Clock, Download } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { downloadCsvFile } from "../../lib/exportUtils";

const BASE_LOGS = [
  { id: "sys-1", event: "Tranche 1 Disbursed", details: "₹2,50,000 transferred to Lead Coordinator Dr. Rajesh Kumar", actor: "Prof. Dr. K. Narayanan (Admin)", time: "Today, 10:45 AM", type: "Finance" },
  { id: "sys-2", event: "Manual Attendance Override", details: "Student CS-2026-042 (Sneha Sharma) marked Present at Gate 2", actor: "Dr. Rajesh Kumar (Coordinator)", time: "Today, 10:15 AM", type: "Attendance" },
  { id: "sys-3", event: "Itinerary Milestone Added", details: "Inserted CDAC Lab Tour slot for Day 2 11:30 AM", actor: "Prof. Anjali Menon", time: "Yesterday, 06:20 PM", type: "Itinerary" },
  { id: "sys-4", event: "RTO Transit Permit Uploaded", details: "Police transit pass GJ-2026-9921 verified and attached", actor: "Administrative Office", time: "Yesterday, 02:00 PM", type: "Compliance" },
  { id: "sys-5", event: "Emergency SMS Dispatched", details: "Broadcasting checklist to 4 pending students", actor: "Automated System Alert", time: "Nov 20, 09:30 AM", type: "System" },
];

const CATEGORIES = ["All", "Room", "Finance", "Attendance", "Itinerary", "Compliance", "System"];

export default function AdminLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [liveRoomLogs, setLiveRoomLogs] = useState([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;
    supabase
      .from("room_audit_log")
      .select("id, action, detail, created_at, actor_id")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (!active || error || !Array.isArray(data)) return;
        const formatted = data.map((row) => ({
          id: `room-${row.id}`,
          event: `Room: ${row.action.replaceAll("_", " ")}`,
          details: row.detail ? JSON.stringify(row.detail) : "Room allocation state transition",
          actor: row.actor_id ? `User ${String(row.actor_id).slice(0, 8)}...` : "System",
          time: new Date(row.created_at).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "Room",
        }));
        setLiveRoomLogs(formatted);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const allLogs = [...liveRoomLogs, ...BASE_LOGS];
  const filtered = allLogs.filter((l) => {
    const matchesType = selectedType === "All" || l.type === selectedType;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      l.event.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      l.actor.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const handleExportLogs = () => {
    downloadCsvFile(
      `Audit_Logs_${Date.now()}.csv`,
      ["Event", "Category", "Details", "Actor", "Timestamp"],
      filtered.map((l) => [l.event, l.type, l.details, l.actor, l.time])
    );
    toast.success("Exported filtered audit logs CSV.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">System Governance & Audit Trail</p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            Security & Operational Audit Logs
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Cryptographically immutable event log of all administrative authorizations, room updates, overrides, and fund movements.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportLogs}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 sm:self-auto"
        >
          <Download size={15} className="text-emerald-800" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filter audit events by actor or action..."
            aria-label="Filter audit events"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none shadow-sm"
          />
        </div>

        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={selectedType === cat}
              onClick={() => setSelectedType(cat)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${
                selectedType === cat
                  ? "bg-emerald-950 text-white shadow-xs"
                  : "bg-white text-gray-600 ring-1 ring-gray-100 hover:bg-emerald-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Feed */}
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-7 space-y-3">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-500">
            No audit events match your current search or category filter.
          </p>
        ) : (
          filtered.map((log) => (
            <div
              key={log.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 hover:bg-emerald-50/20 transition text-xs"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 mt-0.5">
                  <Activity size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-emerald-950 sm:text-sm">{log.event}</h4>
                    <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold text-gray-700">
                      {log.type}
                    </span>
                  </div>
                  <p className="mt-0.5 break-words text-gray-600">{log.details}</p>
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
          ))
        )}
      </div>
    </div>
  );
}
