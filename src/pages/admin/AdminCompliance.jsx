import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { downloadTextFile } from "../../lib/exportUtils";
import { api } from "../../services/api";
import {
  ShieldCheck,
  Download,
  Printer,
  Plus,
  Edit3,
  Trash2,
  X,
  FileCheck,
} from "lucide-react";

const STORAGE_KEY = "iv_admin_compliance_v2";

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  reference: "",
  status: "Pending",
};

export default function AdminCompliance() {
  const [permits, setPermits] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [consentStats, setConsentStats] = useState({ total: 0, signed: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(permits));
    } catch {
      // Ignore storage limits
    }
  }, [permits]);

  useEffect(() => {
    api
      .getApprovedStudents()
      .then((res) => {
        const list = Array.isArray(res?.students)
          ? res.students.filter((s) => String(s.role || "student").toLowerCase() === "student")
          : [];
        setConsentStats({
          total: list.length,
          signed: list.filter((s) => Boolean(s.consent_given)).length,
        });
      })
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (permit) => {
    setEditing(permit);
    setForm({
      title: permit.title || "",
      subtitle: permit.subtitle || "",
      reference: permit.reference || "",
      status: permit.status || "Pending",
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Document title is required.");
      return;
    }

    if (editing) {
      setPermits((prev) =>
        prev.map((p) => (p.id === editing.id ? { ...p, ...form, title: form.title.trim() } : p))
      );
      toast.success(`Updated "${form.title.trim()}".`);
    } else {
      setPermits((prev) => [
        { id: `DOC-${Date.now()}`, ...form, title: form.title.trim() },
        ...prev,
      ]);
      toast.success(`Added "${form.title.trim()}".`);
    }
    setModalOpen(false);
  };

  const handleDelete = (permit) => {
    if (!window.confirm(`Delete compliance record "${permit.title}"?`)) return;
    setPermits((prev) => prev.filter((p) => p.id !== permit.id));
    toast.success(`Deleted "${permit.title}".`);
  };

  const toggleStatus = (permit) => {
    const next = permit.status === "Cleared" ? "Pending" : "Cleared";
    setPermits((prev) => prev.map((p) => (p.id === permit.id ? { ...p, status: next } : p)));
    toast.success(`Marked "${permit.title}" as ${next}.`);
  };

  const downloadPermit = (permit) => {
    const content = [
      "IV CONNECT — STATUTORY COMPLIANCE RECORD",
      `Document: ${permit.title}`,
      `Reference Code: ${permit.reference || "N/A"}`,
      `Summary: ${permit.subtitle || "N/A"}`,
      `Status: ${permit.status}`,
      `Exported At: ${new Date().toLocaleString()}`,
    ].join("\n");
    const safeName = `${permit.title.replace(/[^a-z0-9]+/gi, "_")}.txt`;
    downloadTextFile(safeName, content);
    toast.success(`Downloaded clearance record: ${safeName}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Statutory Governance</p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            Institutional Permits &amp; Compliance
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Track industry permissions (Odoo India, Sense Electricals, IIT Delhi), transit passes, and student consent submissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              window.print();
              toast.success("Opened print / PDF save dialog.");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50"
          >
            <Printer size={15} />
            <span>Print Register</span>
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-900"
          >
            <Plus size={15} />
            <span>Add Clearance</span>
          </button>
        </div>
      </div>

      {/* Live Student Consent Counter */}
      <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
            <FileCheck size={18} />
          </div>
          <div>
            <p className="font-extrabold text-emerald-950">Student Medical &amp; Parent Declarations</p>
            <p className="text-[11px] text-emerald-800">
              Live count from approved student profiles in Supabase
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white px-3 py-1 font-black text-emerald-950 ring-1 ring-emerald-200">
          {consentStats.signed} / {consentStats.total} Signed
        </span>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:p-7 space-y-4">
        <h3 className="font-extrabold text-emerald-950 text-base">
          Permits &amp; Industry Clearances ({permits.length})
        </h3>

        {permits.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-8 text-center text-xs text-gray-500">
            No permit records added yet. Click <strong>Add Clearance</strong> to track industry permissions, train/bus transit documents, or principal sanction orders.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {permits.map((permit) => (
              <div
                key={permit.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">{permit.title}</h4>
                      {permit.subtitle && <p className="text-[11px] text-gray-500">{permit.subtitle}</p>}
                      {permit.reference && (
                        <p className="mt-0.5 font-mono text-[10px] text-emerald-800">{permit.reference}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStatus(permit)}
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      permit.status === "Cleared"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {permit.status}
                  </button>
                </div>

                <div className="flex justify-end gap-1.5 border-t border-gray-200/70 pt-2.5 text-xs">
                  <button
                    type="button"
                    aria-label={`Download ${permit.title}`}
                    onClick={() => downloadPermit(permit)}
                    className="rounded-lg border border-gray-200 bg-white p-1.5 text-emerald-800 hover:bg-emerald-50"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit ${permit.title}`}
                    onClick={() => openEdit(permit)}
                    className="rounded-lg border border-emerald-200 bg-white p-1.5 text-emerald-800 hover:bg-emerald-50"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${permit.title}`}
                    onClick={() => handleDelete(permit)}
                    className="rounded-lg border border-red-200 bg-white p-1.5 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editing ? "Edit Clearance" : "Add Clearance"}
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-emerald-950">
                {editing ? "Edit Compliance Record" : "Add Compliance / Permit Record"}
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
              <div>
                <label className="block font-bold text-gray-700">Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Odoo India Visit Permission Letter"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700">Details / Summary</label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700">Reference Code</label>
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Cleared">Cleared</option>
                  </select>
                </div>
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
                  {editing ? "Save Changes" : "Add Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
