import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Bus,
  Building2,
  CheckCircle2,
  Plus,
  Edit3,
  Trash2,
  X,
  BedDouble,
} from "lucide-react";

const STORAGE_KEY = "iv_admin_contracts_v1";

const EMPTY_FORM = {
  category: "transport",
  vendorName: "",
  referenceCode: "",
  scopeSummary: "",
  amountLabel: "",
  notes: "",
  status: "Pending",
};

export default function AdminLogistics() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
    } catch {
      // Ignore storage limit errors
    }
  }, [contracts]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      category: item.category || "transport",
      vendorName: item.vendorName || "",
      referenceCode: item.referenceCode || "",
      scopeSummary: item.scopeSummary || "",
      amountLabel: item.amountLabel || "",
      notes: item.notes || "",
      status: item.status || "Pending",
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.vendorName.trim()) {
      toast.error("Vendor or hotel name is required.");
      return;
    }

    if (editing) {
      setContracts((prev) =>
        prev.map((c) =>
          c.id === editing.id ? { ...c, ...form, vendorName: form.vendorName.trim() } : c
        )
      );
      toast.success(`Updated contract "${form.vendorName.trim()}".`);
    } else {
      setContracts((prev) => [
        { id: `CTR-${Date.now()}`, ...form, vendorName: form.vendorName.trim() },
        ...prev,
      ]);
      toast.success(`Added contract "${form.vendorName.trim()}".`);
    }
    setModalOpen(false);
  };

  const handleDelete = (item) => {
    if (!window.confirm(`Delete contract "${item.vendorName}"?`)) return;
    setContracts((prev) => prev.filter((c) => c.id !== item.id));
    toast.success(`Removed "${item.vendorName}".`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Vendor Management</p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            Fleet &amp; Hospitality Contracts
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Record transport, train/bus, and hotel agreements as bookings are finalized.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => navigate("/admin/rooms")}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-xs hover:bg-emerald-50"
          >
            <BedDouble size={15} />
            <span>Room Allocation</span>
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-900 active:scale-95"
          >
            <Plus size={15} />
            <span>Add Contract</span>
          </button>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center space-y-3">
          <Bus size={34} className="mx-auto text-emerald-700 opacity-60" />
          <h2 className="text-base font-bold text-emerald-950">No vendor contracts added yet</h2>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Hotel and travel details can be added here whenever confirmed (train 3 AC, tourist buses, or stay agreements).
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-900"
          >
            <Plus size={14} /> Add First Contract
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {contracts.map((item) => {
            const isHotel = item.category === "hotel";
            return (
              <div key={item.id} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-4">
                <div className="flex items-start justify-between border-b border-gray-100 pb-3 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        isHotel ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {isHotel ? <Building2 size={22} /> : <Bus size={22} />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-emerald-950 text-base">{item.vendorName}</h3>
                      <p className="text-xs text-gray-500">{item.referenceCode || "No reference code"}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                      item.status === "Executed" || item.status === "Confirmed"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {item.scopeSummary && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-400 font-semibold">Scope:</span>
                      <span className="font-bold text-emerald-950 text-right">{item.scopeSummary}</span>
                    </div>
                  )}
                  {item.amountLabel && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-400 font-semibold">Amount:</span>
                      <span className="font-bold text-emerald-950 text-right">{item.amountLabel}</span>
                    </div>
                  )}
                  {item.notes && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-400 font-semibold">Notes:</span>
                      <span className="font-bold text-emerald-700 text-right flex items-center gap-1">
                        <CheckCircle2 size={13} className="shrink-0" />
                        {item.notes}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 text-xs">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 font-bold text-emerald-900 hover:bg-emerald-100"
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    aria-label={`Delete ${item.vendorName}`}
                    className="inline-flex items-center rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editing ? "Edit Vendor Contract" : "Add Vendor Contract"}
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-emerald-950">
                {editing ? "Edit Contract" : "Add Transport / Hotel Contract"}
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900"
                  >
                    <option value="transport">Transport / Train / Bus</option>
                    <option value="hotel">Hotel / Stay</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Executed">Executed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700">Vendor / Hotel Name *</label>
                <input
                  type="text"
                  required
                  value={form.vendorName}
                  onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                  placeholder="e.g. Indian Railways 3 AC / Hotel Name"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700">Reference / PNR / MoU</label>
                  <input
                    type="text"
                    value={form.referenceCode}
                    onChange={(e) => setForm({ ...form, referenceCode: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700">Contract Value</label>
                  <input
                    type="text"
                    value={form.amountLabel}
                    onChange={(e) => setForm({ ...form, amountLabel: e.target.value })}
                    placeholder="e.g. ₹1,50,000"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700">Rooms / Coaches / Capacity</label>
                <input
                  type="text"
                  value={form.scopeSummary}
                  onChange={(e) => setForm({ ...form, scopeSummary: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-800 px-5 py-2 font-bold text-white hover:bg-emerald-900"
                >
                  {editing ? "Save Changes" : "Add Contract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
