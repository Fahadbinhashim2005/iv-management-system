import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users,
  Coins,
  ShieldCheck,
  Plus,
  CheckCircle2,
  Lock,
  Clock,
  ArrowRight,
  BedDouble,
} from "lucide-react";
import { api } from "../../services/api";
import { roomsApi } from "../../features/rooms/api/roomsApi";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [registrationsLocked, setRegistrationsLocked] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [stays, setStays] = useState([]);

  useEffect(() => {
    let active = true;
    api
      .getAccessRequests()
      .then((res) => {
        if (active && res?.count) setPendingRequestsCount(res.count);
      })
      .catch(() => {});

    roomsApi
      .listStays()
      .then((data) => {
        if (active && Array.isArray(data)) setStays(data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const handleToggleLock = () => {
    const next = !registrationsLocked;
    setRegistrationsLocked(next);
    toast.success(
      next
        ? "Student registrations locked. Final participant roster frozen."
        : "Student registration portal unlocked for all departments."
    );
  };

  const totalRoomsCount = stays.reduce((acc, s) => acc + (s.summary?.roomCount || 0), 0);
  const occupiedBedsCount = stays.reduce((acc, s) => acc + (s.summary?.occupiedBeds || 0), 0);
  const totalBedsCount = stays.reduce((acc, s) => acc + (s.summary?.totalBeds || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Pending Access Requests Banner */}
      {pendingRequestsCount > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-amber-500/10 border border-amber-300 p-4 text-xs font-bold text-amber-950 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <Clock size={16} />
            </span>
            <div>
              <p className="font-black text-amber-950 text-sm">
                {pendingRequestsCount} Pending Access {pendingRequestsCount === 1 ? "Request" : "Requests"}
              </p>
              <p className="text-[11px] text-amber-800 font-medium">
                New students or coordinators have signed in and require your administrative approval.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => navigate("/admin/students")}
              className="flex items-center gap-1 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-black text-white hover:bg-amber-700 transition"
            >
              <span>Review Requests</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-black text-amber-900 uppercase tracking-wider">
              Institutional Master Deck
            </span>
            <span className="text-xs text-gray-500 font-semibold">• All Departments & Batches</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            Chief Tour Administrator Console
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Institutional oversight for budgets, faculty authorization, safety compliance, and multi-trip management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/admin/rooms")}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-sm transition hover:bg-emerald-50 active:scale-95"
          >
            <BedDouble size={15} />
            <span>
              Rooms{totalRoomsCount > 0 ? ` (${occupiedBedsCount}/${totalBedsCount})` : ""}
            </span>
          </button>

          <button
            type="button"
            onClick={handleToggleLock}
            aria-pressed={registrationsLocked}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black transition shadow-sm active:scale-95 ${
              registrationsLocked
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-emerald-900"
            }`}
          >
            <Lock size={15} />
            <span>{registrationsLocked ? "Unlock Registrations" : "Freeze All Rosters"}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/visits")}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-900 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-emerald-700 hover:to-emerald-800 active:scale-95"
          >
            <Plus size={16} className="text-amber-300" />
            <span>Create Master Tour</span>
          </button>
        </div>
      </header>

      {/* 4 Super Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1 */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">Total Sanctioned</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Coins size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">₹12.80 L</p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span className="font-bold text-emerald-700">3 Tours Budgeted</span>
            <span>₹4.85L Committed</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">Total Participants</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Users size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">342</p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span className="font-bold text-emerald-600">3 Batches (CSE/ECE)</span>
            <span>96% Cap Occupied</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">Faculty Officers</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">14 Leads</p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold text-blue-700">All Roles Assigned</span>
            <span>Ratio 1:24</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">Statutory Clearances</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-950 sm:text-3xl">100%</p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span className="font-bold text-emerald-700">Police & RTO Ready</span>
            <span>3 Bus Permits</span>
          </div>
        </div>
      </section>

      {/* Master Tour Programs Table Overview */}
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-emerald-950">Active Institutional Visit Programs</h2>
            <p className="text-xs text-gray-500">
              Oversee master authorization states, budgets, and lead faculty coordinators across all departments.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/visits")}
            className="text-xs font-bold text-emerald-800 hover:underline"
          >
            Manage Master Registry →
          </button>
        </div>

        {/* Mobile Cards for Active Tours */}
        <div className="space-y-3 md:hidden">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-2.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-emerald-950 text-sm">Industrial Visit 2026 — GIFT City & Tech Hub</p>
                <p className="text-gray-500 text-[11px]">Dec 5 - Dec 8, 2026 • Computer Science & Eng.</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-900">
                Published
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-600">
              <span>Lead: <strong className="text-gray-900">Dr. Rajesh Kumar</strong></span>
              <span className="font-bold text-emerald-950">₹5,40,000 • 128/135</span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/coordinator/dashboard")}
              className="w-full rounded-xl bg-emerald-50 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              Open Coordinator Deck
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-2.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-emerald-950 text-sm">Bangalore Tech Park & Aerospace Study Tour</p>
                <p className="text-gray-500 text-[11px]">Feb 12 - Feb 16, 2027 • Batch 2024-28 (Sem 3)</p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-900">
                Dean Review
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-600">
              <span>Lead: <strong className="text-gray-900">Prof. Vikram Mohan</strong></span>
              <span className="font-bold text-emerald-950">₹4,20,000 • 84/120</span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/visits")}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Authorize Tour
            </button>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">Program Details</th>
                <th className="px-4 py-3">Lead Coordinator</th>
                <th className="px-4 py-3">Budget Authorized</th>
                <th className="px-4 py-3">Capacity & Roster</th>
                <th className="px-4 py-3">Governance Status</th>
                <th className="px-4 py-3 text-right">Master Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Tour 1 */}
              <tr className="hover:bg-gray-50/60 transition">
                <td className="px-4 py-3.5">
                  <p className="font-bold text-emerald-950 text-sm">Industrial Visit 2026 — GIFT City & Tech Hub</p>
                  <p className="text-gray-500 text-[11px]">Dec 5 - Dec 8, 2026 • Computer Science & Eng.</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-semibold text-gray-900">Dr. Rajesh Kumar</p>
                  <p className="text-[10px] text-emerald-800 font-bold">HOD & Lead Coordinator</p>
                </td>
                <td className="px-4 py-3.5 font-bold text-emerald-950">₹5,40,000</td>
                <td className="px-4 py-3.5">
                  <p className="font-bold text-emerald-950">128 / 135 Students</p>
                  <div className="mt-1 h-1.5 w-24 rounded-full bg-gray-200">
                    <div className="h-1.5 rounded-full bg-emerald-600" style={{ width: "95%" }} />
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-900">
                    Published & Cleared
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => navigate("/coordinator/dashboard")}
                    className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                  >
                    Open Deck
                  </button>
                </td>
              </tr>

              {/* Tour 2 */}
              <tr className="hover:bg-gray-50/60 transition">
                <td className="px-4 py-3.5">
                  <p className="font-bold text-emerald-950 text-sm">Bangalore Tech Park & Aerospace Study Tour</p>
                  <p className="text-gray-500 text-[11px]">Feb 12 - Feb 16, 2027 • Batch 2024-28 (Semester 3)</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-semibold text-gray-900">Prof. Vikram Mohan</p>
                  <p className="text-[10px] text-blue-800 font-bold">Associate Coordinator</p>
                </td>
                <td className="px-4 py-3.5 font-bold text-emerald-950">₹4,20,000</td>
                <td className="px-4 py-3.5">
                  <p className="font-bold text-emerald-950">84 / 120 Students</p>
                  <div className="mt-1 h-1.5 w-24 rounded-full bg-gray-200">
                    <div className="h-1.5 rounded-full bg-amber-500" style={{ width: "70%" }} />
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-900">
                    Under Dean Review
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => navigate("/admin/visits")}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Authorize
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Governance & Institutional Clearance Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Statutory Permits & Clearance */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-emerald-950 text-sm">Legal & Police Transit Clearances</h3>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              All Clear
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="font-bold text-gray-800">RTO Inter-State Highway Police Transit Pass</span>
              </div>
              <span className="font-mono text-[10px] text-gray-500">RTO-GJ-2026-9921</span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="font-bold text-gray-800">GIFT City Security Visitor Protocol Pass</span>
              </div>
              <span className="font-mono text-[10px] text-gray-500">GIFT-SEC-842</span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="font-bold text-gray-800">ISRO SAC Ahmedabad Educational Group Clearance</span>
              </div>
              <span className="font-mono text-[10px] text-gray-500">ISRO-SAC-EDU-411</span>
            </div>
          </div>
        </section>

        {/* Master Coordinator Roster */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-emerald-950 text-sm">Faculty Coordinator Assignments</h3>
            <button
              type="button"
              onClick={() => navigate("/admin/coordinators")}
              className="text-xs font-bold text-emerald-800 hover:underline"
            >
              Configure Leads →
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
              <div>
                <p className="font-bold text-emerald-950">Dr. Rajesh Kumar (HOD)</p>
                <p className="text-[10px] text-gray-500">Lead Tour Commander • GIFT City Tour</p>
              </div>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                Active Lead
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
              <div>
                <p className="font-bold text-emerald-950">Prof. Anjali Menon</p>
                <p className="text-[10px] text-gray-500">Logistics & Hotel In-Charge • Bus 04 Lead</p>
              </div>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                Logistics Lead
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
              <div>
                <p className="font-bold text-emerald-950">Prof. Vikram Mohan</p>
                <p className="text-[10px] text-gray-500">Safety & Medical Protocol Officer</p>
              </div>
              <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-900">
                Medical Officer
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
