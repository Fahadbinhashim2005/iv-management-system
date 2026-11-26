import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { downloadCsvFile } from "../../lib/exportUtils";
import { Coins, Download, Plus, CheckCircle2 } from "lucide-react";

const TOTAL_SANCTIONED = 1280000;
const BASE_COMMITTED = 905000;

const INITIAL_TRANCHES = [
  {
    id: "TR-01",
    label: "Tranche 1 — Fleet & Hotel Booking Advance",
    recipient: "Dr. Rajesh Kumar",
    amount: 250000,
    date: "2026-11-20",
    status: "Disbursed",
  },
];

function formatINR(amount) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export default function AdminFinances() {
  const [tranches, setTranches] = useState(() => {
    try {
      const saved = localStorage.getItem("iv_admin_tranches_v1");
      return saved ? JSON.parse(saved) : INITIAL_TRANCHES;
    } catch {
      return INITIAL_TRANCHES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("iv_admin_tranches_v1", JSON.stringify(tranches));
    } catch {
      // Ignore storage limits
    }
  }, [tranches]);

  const extraDisbursed = tranches.slice(1).reduce((sum, t) => sum + t.amount, 0);
  const totalCommitted = BASE_COMMITTED + extraDisbursed;
  const availableReserve = Math.max(0, TOTAL_SANCTIONED - totalCommitted);

  const handleDisburse = () => {
    if (availableReserve < 50000) {
      toast.error("Insufficient reserve balance for an additional ₹1,50,000 tranche.");
      return;
    }
    const releaseAmount = Math.min(150000, availableReserve);
    const nextNum = tranches.length + 1;
    const entry = {
      id: `TR-0${nextNum}`,
      label: `Tranche ${nextNum} — Field Emergency & Contingency Release`,
      recipient: "Dr. Rajesh Kumar",
      amount: releaseAmount,
      date: new Date().toISOString().slice(0, 10),
      status: "Disbursed",
    };
    setTranches((prev) => [entry, ...prev]);
    toast.success(`Released ${entry.id} (${formatINR(releaseAmount)}) to Lead Coordinator Dr. Rajesh Kumar.`);
  };

  const handleExportLedger = () => {
    downloadCsvFile(
      "IV2026_Financial_Ledger.csv",
      ["Tranche ID", "Description", "Recipient", "Amount (INR)", "Date", "Status"],
      tranches.map((t) => [t.id, t.label, t.recipient, t.amount, t.date, t.status])
    );
    toast.success("Downloaded financial sanction ledger CSV.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportLedger}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50"
          >
            <Download size={15} className="text-emerald-800" />
            <span>Export Ledger CSV</span>
          </button>

          <button
            type="button"
            onClick={handleDisburse}
            className="flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-900 active:scale-95"
          >
            <Plus size={15} className="text-amber-300" />
            <Coins size={16} className="text-amber-300" />
            <span>Release Field Advance Tranche</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Sanctioned (All Tours)</span>
          <p className="mt-2 text-2xl font-black text-emerald-950 sm:text-3xl">{formatINR(TOTAL_SANCTIONED)}</p>
          <p className="mt-1 text-xs text-emerald-700 font-semibold">Sanctioned by Management Finance Committee</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Committed Funds</span>
          <p className="mt-2 text-2xl font-black text-blue-900 sm:text-3xl">{formatINR(totalCommitted)}</p>
          <p className="mt-1 text-xs text-gray-500">Fleet, Hotel, Entry passes, Disbursed Tranches</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Available Reserves</span>
          <p className="mt-2 text-2xl font-black text-amber-700 sm:text-3xl">{formatINR(availableReserve)}</p>
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

      {/* Tranche Disbursement History */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-3">
        <h3 className="font-extrabold text-emerald-950 text-base">Disbursement Tranches ({tranches.length})</h3>
        <div className="space-y-2.5 text-xs">
          {tranches.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-100 bg-gray-50/70 p-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-900">
                    {t.id}
                  </span>
                  <h4 className="font-bold text-emerald-950">{t.label}</h4>
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  Recipient: <strong className="text-gray-800">{t.recipient}</strong> • {t.date}
                </p>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="font-black text-sm text-emerald-950">{formatINR(t.amount)}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  <CheckCircle2 size={11} />
                  {t.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
