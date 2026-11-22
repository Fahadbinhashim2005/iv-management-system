import { useState } from "react";
import { 
  Coins, 
  CheckCircle2
} from "lucide-react";

export default function AdminFinances() {
  const [toastMsg, setToastMsg] = useState("");

  const handleDisburse = () => {
    setToastMsg("Released Tranche 2 (₹1,50,000) to Lead Coordinator Dr. Rajesh Kumar.");
    setTimeout(() => setToastMsg(""), 3500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-950 border border-amber-400 px-4 py-3 text-xs font-bold text-white shadow-2xl">
          <CheckCircle2 size={16} className="text-amber-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Financial Governance</p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            Tour Budgets & Sanction Ledgers
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Approve tranches, monitor committed expenditures, and authorize emergency contingency funds.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDisburse}
          className="flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-900 active:scale-95 self-start sm:self-auto"
        >
          <Coins size={16} className="text-amber-300" />
          <span>Release Field Advance Tranche</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Sanctioned (All Tours)</span>
          <p className="mt-2 text-2xl font-black text-emerald-950 sm:text-3xl">₹12,80,000</p>
          <p className="mt-1 text-xs text-emerald-700 font-semibold">Sanctioned by Management Finance Committee</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Committed Funds</span>
          <p className="mt-2 text-2xl font-black text-blue-900 sm:text-3xl">₹9,05,000</p>
          <p className="mt-1 text-xs text-gray-500">Fleet, Hotel, Entry passes, Insurance</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Available Reserves</span>
          <p className="mt-2 text-2xl font-black text-amber-700 sm:text-3xl">₹3,75,000</p>
          <p className="mt-1 text-xs text-gray-500">Institutional buffer for emergency deviations</p>
        </div>
      </div>

      {/* Tour by Tour Financial Breakdown */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
        <h3 className="font-extrabold text-emerald-950 text-base">Active Tour Expense Breakdown</h3>

        <div className="space-y-3 text-xs">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200/70 pb-3">
              <div>
                <h4 className="font-bold text-emerald-950 text-sm">Industrial Visit 2026 — Ahmedabad & GIFT City</h4>
                <p className="text-[11px] text-gray-500">IV Code: CSE-2026-AHM • Sanction: ₹5,40,000</p>
              </div>
              <span className="self-start sm:self-auto rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900">
                89.8% Committed
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <span className="text-gray-400 font-semibold">Bus Fleet:</span>
                <p className="font-bold text-gray-900">₹2,18,000</p>
              </div>
              <div>
                <span className="text-gray-400 font-semibold">Hotel Stay:</span>
                <p className="font-bold text-gray-900">₹1,94,000</p>
              </div>
              <div>
                <span className="text-gray-400 font-semibold">Entry / Passes:</span>
                <p className="font-bold text-gray-900">₹73,000</p>
              </div>
              <div>
                <span className="text-gray-400 font-semibold">Contingency:</span>
                <p className="font-bold text-emerald-700">₹55,000</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
