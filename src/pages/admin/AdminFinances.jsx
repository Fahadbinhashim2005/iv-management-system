import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { downloadCsvFile } from "../../lib/exportUtils";
import { Download, Plus, CheckCircle2, Edit3, Trash2, X } from "lucide-react";

const BUDGET_STORAGE_KEY = "iv_admin_budget_v2";
const TRANCHES_STORAGE_KEY = "iv_admin_tranches_v2";

const DEFAULT_BUDGET = {
  totalSanctioned: 0,
  committedBase: 0,
  notes: "Configure the sanctioned tour budget and add disbursement tranches as expenses occur.",
};

const EMPTY_TRANCHE = {
  label: "",
  recipient: "",
  amount: "",
  date: "",
  status: "Disbursed",
};

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

export default function AdminFinances() {
  const [budget, setBudget] = useState(() => {
    try {
      const saved = localStorage.getItem(BUDGET_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_BUDGET;
    } catch {
      return DEFAULT_BUDGET;
    }
  });

  const [tranches, setTranches] = useState(() => {
    try {
      const saved = localStorage.getItem(TRANCHES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState(budget);

  const [trancheModalOpen, setTrancheModalOpen] = useState(false);
  const [editingTranche, setEditingTranche] = useState(null);
  const [trancheForm, setTrancheForm] = useState(EMPTY_TRANCHE);

  useEffect(() => {
    try {
      localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budget));
    } catch {
      // Ignore storage limits
    }
  }, [budget]);

  useEffect(() => {
    try {
      localStorage.setItem(TRANCHES_STORAGE_KEY, JSON.stringify(tranches));
    } catch {
      // Ignore storage limits
    }
  }, [tranches]);

  const tranchesSum = tranches.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalCommitted = (Number(budget.committedBase) || 0) + tranchesSum;
  const availableReserve = Math.max(0, (Number(budget.totalSanctioned) || 0) - totalCommitted);

  const openBudgetModal = () => {
    setBudgetForm({
      totalSanctioned: budget.totalSanctioned ?? 0,
      committedBase: budget.committedBase ?? 0,
      notes: budget.notes || "",
    });
    setBudgetModalOpen(true);
  };

  const handleSaveBudget = (e) => {
    e.preventDefault();
    setBudget({
      totalSanctioned: Math.max(0, Number(budgetForm.totalSanctioned) || 0),
      committedBase: Math.max(0, Number(budgetForm.committedBase) || 0),
      notes: String(budgetForm.notes || "").trim(),
    });
    setBudgetModalOpen(false);
    toast.success("Budget summary updated.");
  };

  const openCreateTranche = () => {
    setEditingTranche(null);
    setTrancheForm({
      ...EMPTY_TRANCHE,
      date: new Date().toISOString().slice(0, 10),
    });
    setTrancheModalOpen(true);
  };

  const openEditTranche = (tranche) => {
    setEditingTranche(tranche);
    setTrancheForm({
      label: tranche.label || "",
      recipient: tranche.recipient || "",
      amount: String(tranche.amount ?? ""),
      date: tranche.date || "",
      status: tranche.status || "Disbursed",
    });
    setTrancheModalOpen(true);
  };

  const handleSaveTranche = (e) => {
    e.preventDefault();
    const numericAmount = Number(trancheForm.amount);
    if (!trancheForm.label.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Enter a valid description and positive amount.");
      return;
    }

    if (editingTranche) {
      setTranches((prev) =>
        prev.map((t) =>
          t.id === editingTranche.id
            ? {
                ...t,
                label: trancheForm.label.trim(),
                recipient: trancheForm.recipient.trim(),
                amount: numericAmount,
                date: trancheForm.date,
                status: trancheForm.status,
              }
            : t
        )
      );
      toast.success(`Updated ${editingTranche.id}.`);
    } else {
      const nextNum = tranches.length + 1;
      const entry = {
        id: `TR-${String(nextNum).padStart(2, "0")}`,
        label: trancheForm.label.trim(),
        recipient: trancheForm.recipient.trim() || "Tour Coordinator",
        amount: numericAmount,
        date: trancheForm.date || new Date().toISOString().slice(0, 10),
        status: trancheForm.status,
      };
      setTranches((prev) => [entry, ...prev]);
      toast.success(`Added ${entry.id} (${formatINR(numericAmount)}).`);
    }
    setTrancheModalOpen(false);
  };

  const handleDeleteTranche = (tranche) => {
    if (!window.confirm(`Delete tranche "${tranche.label}"?`)) return;
    setTranches((prev) => prev.filter((t) => t.id !== tranche.id));
    toast.success(`Removed ${tranche.id}.`);
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
            Tour Budgets &amp; Sanction Ledgers
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Industrial Visit 2026 — Rajasthan &amp; Delhi expenditure and tranche records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openBudgetModal}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-xs hover:bg-emerald-50"
          >
            <Edit3 size={14} />
            <span>Edit Budget</span>
          </button>

          <button
            type="button"
            onClick={handleExportLedger}
            disabled={tranches.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 disabled:opacity-50"
          >
            <Download size={14} className="text-emerald-800" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={openCreateTranche}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-900 active:scale-95"
          >
            <Plus size={15} className="text-amber-300" />
            <span>Add Tranche</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Sanctioned</span>
          <p className="mt-2 text-2xl font-black text-emerald-950 sm:text-3xl">
            {formatINR(budget.totalSanctioned)}
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-semibold">Click Edit Budget to configure</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Committed &amp; Disbursed</span>
          <p className="mt-2 text-2xl font-black text-blue-900 sm:text-3xl">
            {formatINR(totalCommitted)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Base ({formatINR(budget.committedBase)}) + Tranches ({formatINR(tranchesSum)})
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Available Reserves</span>
          <p className="mt-2 text-2xl font-black text-amber-700 sm:text-3xl">
            {formatINR(availableReserve)}
          </p>
          <p className="mt-1 text-xs text-gray-500">{budget.notes || "Institutional buffer"}</p>
        </div>
      </div>

      {/* Tranche Disbursement History */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-emerald-950 text-base">
            Disbursement Tranches ({tranches.length})
          </h3>
        </div>

        {tranches.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-8 text-center text-xs text-gray-500">
            No disbursement tranches recorded yet. Click <strong>Add Tranche</strong> to record an expense or release.
          </p>
        ) : (
          <div className="space-y-2.5 text-xs">
            {tranches.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-100 bg-gray-50/70 p-4"
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

                <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                  <span className="font-black text-sm text-emerald-950">{formatINR(t.amount)}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    <CheckCircle2 size={11} />
                    {t.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditTranche(t)}
                    aria-label={`Edit ${t.id}`}
                    className="rounded-lg border border-emerald-200 bg-white p-1.5 text-emerald-800 hover:bg-emerald-50"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTranche(t)}
                    aria-label={`Delete ${t.id}`}
                    className="rounded-lg border border-red-200 bg-white p-1.5 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Budget Modal */}
      {budgetModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit Budget Summary"
          onClick={() => setBudgetModalOpen(false)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-emerald-950">Edit Tour Budget</h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setBudgetModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveBudget} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700">Total Sanctioned Amount (INR)</label>
                <input
                  type="number"
                  min={0}
                  value={budgetForm.totalSanctioned}
                  onChange={(e) => setBudgetForm({ ...budgetForm, totalSanctioned: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700">Committed Base Costs (INR)</label>
                <input
                  type="number"
                  min={0}
                  value={budgetForm.committedBase}
                  onChange={(e) => setBudgetForm({ ...budgetForm, committedBase: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700">Budget Notes</label>
                <input
                  type="text"
                  value={budgetForm.notes}
                  onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-800 px-5 py-2 font-bold text-white hover:bg-emerald-900"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Tranche Modal */}
      {trancheModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingTranche ? "Edit Tranche" : "Add Tranche"}
          onClick={() => setTrancheModalOpen(false)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-emerald-950">
                {editingTranche ? `Edit ${editingTranche.id}` : "Record Disbursement Tranche"}
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setTrancheModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveTranche} className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700">Description *</label>
                <input
                  type="text"
                  required
                  value={trancheForm.label}
                  onChange={(e) => setTrancheForm({ ...trancheForm, label: e.target.value })}
                  placeholder="e.g. Train Booking Advance"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700">Amount (INR) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={trancheForm.amount}
                    onChange={(e) => setTrancheForm({ ...trancheForm, amount: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700">Date</label>
                  <input
                    type="date"
                    value={trancheForm.date}
                    onChange={(e) => setTrancheForm({ ...trancheForm, date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700">Recipient</label>
                  <input
                    type="text"
                    value={trancheForm.recipient}
                    onChange={(e) => setTrancheForm({ ...trancheForm, recipient: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700">Status</label>
                  <select
                    value={trancheForm.status}
                    onChange={(e) => setTrancheForm({ ...trancheForm, status: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900"
                  >
                    <option value="Disbursed">Disbursed</option>
                    <option value="Pending">Pending</option>
                    <option value="Settled">Settled</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setTrancheModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-800 px-5 py-2 font-bold text-white hover:bg-emerald-900"
                >
                  {editingTranche ? "Save Changes" : "Add Tranche"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
