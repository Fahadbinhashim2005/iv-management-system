import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  ClipboardCheck, 
  Bus, 
  BedDouble, 
  Plus, 
  Bell, 
  ArrowRight, 
  Check, 
  X, 
  Clock, 
  MapPin, 
  ScanLine, 
  AlertCircle,
  FileCheck
} from "lucide-react";

export default function CoordinatorDashboard() {
  const navigate = useNavigate();

  // Mock pending requests state with interactive approve/reject
  const [pendingRequests, setPendingRequests] = useState([
    { id: 101, name: "Sneha Sharma", roll: "CS-2026-042", batch: "CSE-A", cgpa: "8.9", date: "Today, 09:15 AM" },
    { id: 102, name: "Vignesh Rajan", roll: "CS-2026-118", batch: "CSE-B", cgpa: "8.4", date: "Yesterday, 04:30 PM" },
    { id: 103, name: "Meera Pillai", roll: "CS-2026-077", batch: "CSE-A", cgpa: "9.2", date: "Yesterday, 02:10 PM" },
  ]);

  const [notificationMsg, setNotificationMsg] = useState("");

  const handleApprove = (id, name) => {
    setPendingRequests((prev) => prev.filter((req) => req.id !== id));
    setNotificationMsg(`Approved participation for ${name}. Notification sent.`);
    setTimeout(() => setNotificationMsg(""), 3500);
  };

  const handleReject = (id, name) => {
    setPendingRequests((prev) => prev.filter((req) => req.id !== id));
    setNotificationMsg(`Rejected application for ${name}.`);
    setTimeout(() => setNotificationMsg(""), 3500);
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-xs font-bold text-white shadow-xl animate-fade-in">
          <FileCheck size={16} />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800">
              Department of Computer Science
            </span>
            <span className="text-xs text-gray-400">• Academic Year 2026-27</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Coordinator Command Center
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Monitor real-time participant registrations, logistics readiness, and digital attendance.
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

      {/* Top Key Statistics Bar */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Enrolled Students</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Users size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">128 <span className="text-sm font-semibold text-gray-400">/ 135</span></p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold text-emerald-600">94.8% Capacity</span>
            <span>7 Seats Left</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Approvals</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Clock size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-amber-700 sm:text-3xl">
            {pendingRequests.length}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>Awaiting Review</span>
            <button 
              type="button" 
              onClick={() => navigate("/coordinator/participants")} 
              className="font-bold text-emerald-700 hover:underline"
            >
              Review All →
            </button>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Attendance Rate</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ClipboardCheck size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">98.4%</p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold text-blue-600">Gate #2 Ready</span>
            <span>4 Checkpoints</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Logistics Readiness</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <Bus size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">100%</p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>3 Volvo Buses</span>
            <span>45 Rooms Booked</span>
          </div>
        </div>
      </section>

      {/* Main Tour Status Showcase Card */}
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-900">
                ACTIVE VISIT
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                Published & Ready
              </span>
              <span className="text-xs text-gray-500">IV Code: CSE-2026-AHM</span>
            </div>

            <h2 className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">
              Industrial Visit 2026 — GIFT City & Ahmedabad
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1 font-semibold text-emerald-800">
                <MapPin size={15} />
                Ahmedabad, Gujarat
              </span>
              <span>•</span>
              <span className="font-medium">5 - 8 December 2026 (4 Days)</span>
              <span>•</span>
              <span className="font-medium">Faculty Leads: Dr. Rajesh Kumar & Prof. Anjali Menon</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/coordinator/itinerary")}
              className="flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900"
            >
              <span>Manage Itinerary</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/coordinator/announcements")}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
            >
              <Bell size={16} />
              <span>Broadcast Notice</span>
            </button>
          </div>
        </div>

        {/* Operational Checklist Meters */}
        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-gray-100 pt-6 sm:grid-cols-4">
          <div className="rounded-xl bg-gray-50/70 p-3.5">
            <p className="text-xs text-gray-500 font-medium">Participant Roster</p>
            <p className="mt-1 text-lg font-bold text-emerald-950">128 Confirmed</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
              <div className="h-1.5 rounded-full bg-emerald-600" style={{ width: "95%" }} />
            </div>
          </div>

          <div className="rounded-xl bg-gray-50/70 p-3.5">
            <p className="text-xs text-gray-500 font-medium">Parent Consent Letters</p>
            <p className="mt-1 text-lg font-bold text-emerald-950">122 / 128 Done</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
              <div className="h-1.5 rounded-full bg-blue-600" style={{ width: "95%" }} />
            </div>
          </div>

          <div className="rounded-xl bg-gray-50/70 p-3.5">
            <p className="text-xs text-gray-500 font-medium">Seat Allocations</p>
            <p className="mt-1 text-lg font-bold text-emerald-950">100% Allocated</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
              <div className="h-1.5 rounded-full bg-purple-600" style={{ width: "100%" }} />
            </div>
          </div>

          <div className="rounded-xl bg-gray-50/70 p-3.5">
            <p className="text-xs text-gray-500 font-medium">Hotel Room Distribution</p>
            <p className="mt-1 text-lg font-bold text-emerald-950">100% Distributed</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
              <div className="h-1.5 rounded-full bg-emerald-600" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Working Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Requests Widget */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-emerald-950">Pending Student Registrations</h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                {pendingRequests.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/coordinator/participants")}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              View Roster
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Students eligible by attendance and academic criteria awaiting approval.
          </p>

          <div className="mt-4 space-y-3">
            {pendingRequests.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-6 text-center text-xs text-gray-500 font-medium">
                No pending registrations. All student requests have been processed!
              </div>
            ) : (
              pendingRequests.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 transition hover:bg-emerald-50/20"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">{student.name}</h4>
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-mono font-bold text-gray-700">
                        {student.roll}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      Batch: {student.batch} • CGPA: {student.cgpa} • Applied: {student.date}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleApprove(student.id, student.name)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800"
                    >
                      <Check size={14} />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(student.id, student.name)}
                      className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
                    >
                      <X size={14} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Logistics & Checkpoint Quick Status */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-emerald-950">Transport & Stay Allocation</h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              Verified
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Vehicles assigned for highway transit and rooms allocated at destination hotel.
          </p>

          <div className="mt-4 space-y-3">
            <div 
              onClick={() => navigate("/coordinator/transport")}
              className="group cursor-pointer rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 transition hover:bg-emerald-50/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Bus size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">
                      Bus Fleet: 3 Volvo Multi-Axle Coaches
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Bus 01 (45), Bus 02 (45), Bus 04 (45) • Drivers confirmed
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition" />
              </div>
            </div>

            <div 
              onClick={() => navigate("/coordinator/accommodation")}
              className="group cursor-pointer rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 transition hover:bg-emerald-50/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                    <BedDouble size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">
                      Hotel Grand Ambience (Ashram Road)
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      45 Rooms Reserved • 128/128 Students mapped to room rosters
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition" />
              </div>
            </div>

            {/* Quick Alert Banner */}
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
              <AlertCircle size={17} className="text-amber-700 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-900 leading-relaxed">
                <span className="font-bold">Next Milestone:</span> Highway police transit clearance pass to be collected from RTO by Dec 2.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
