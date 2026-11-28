import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  MapPin,
  Calendar,
  Building2,
  X,
  CheckCircle2,
  Edit3,
  Trash2,
  Map,
} from "lucide-react";
import { tripConfig } from "../../config/tripConfig";

const STORAGE_KEY = "iv_admin_tours_v2";

const DEFAULT_TOURS = [
  {
    id: "IV-2026-RD",
    title: tripConfig.trip.displayName,
    department: "All Participating Batches",
    host: (tripConfig.trip.industries || []).join(", "),
    location: tripConfig.trip.destination,
    startDate: tripConfig.trip.startDate,
    endDate: tripConfig.trip.endDate,
    capacity: 150,
    status: "Published",
    leadCoordinator: "Chief Faculty & Coordinators",
    budget: "TBC",
    complianceCleared: false,
  },
];

const EMPTY_FORM = {
  title: "",
  department: "",
  host: "",
  location: "",
  startDate: "",
  endDate: "",
  capacity: 120,
  budget: "",
  leadCoordinator: "",
  status: "Draft",
  complianceCleared: false,
};

export default function AdminVisits() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTour, setEditingTour] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [tours, setTours] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_TOURS;
    } catch {
      return DEFAULT_TOURS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tours));
    } catch {
      // Ignore storage limit errors
    }
  }, [tours]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  const openCreateModal = () => {
    setEditingTour(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (tour) => {
    setEditingTour(tour);
    setForm({
      title: tour.title || "",
      department: tour.department || "",
      host: tour.host || "",
      location: tour.location || "",
      startDate: tour.startDate || "",
      endDate: tour.endDate || "",
      capacity: tour.capacity ?? 120,
      budget: tour.budget || "",
      leadCoordinator: tour.leadCoordinator || "",
      status: tour.status || "Draft",
      complianceCleared: Boolean(tour.complianceCleared),
    });
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Tour title is required.");
      return;
    }
    if (form.endDate && form.startDate && form.endDate < form.startDate) {
      toast.error("End date must be on or after start date.");
      return;
    }

    if (editingTour) {
      setTours((prev) =>
        prev.map((t) =>
          t.id === editingTour.id
            ? {
                ...t,
                ...form,
                title: form.title.trim(),
                capacity: Number(form.capacity) || 0,
              }
            : t
        )
      );
      toast.success(`Updated "${form.title.trim()}".`);
    } else {
      const created = {
        id: `IV-${Date.now().toString().slice(-4)}`,
        ...form,
        title: form.title.trim(),
        capacity: Number(form.capacity) || 0,
      };
      setTours((prev) => [created, ...prev]);
      toast.success(`Created "${created.title}".`);
    }
    setModalOpen(false);
  };

  const handleDelete = (tour) => {
    if (!window.confirm(`Remove "${tour.title}" from Master Registry?`)) return;
    setTours((prev) => prev.filter((t) => t.id !== tour.id));
    toast.success(`Removed "${tour.title}".`);
  };

  const toggleStatus = (id, newStatus) => {
    setTours((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
    toast.success(`Tour status updated to ${newStatus}.`);
  };

  const filtered = tours.filter((t) => {
    const q = searchTerm.trim().toLowerCase();
    return (
      !q ||
      (t.title || "").toLowerCase().includes(q) ||
      (t.location || "").toLowerCase().includes(q) ||
      (t.host || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Master Institutional Registry</p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            Tour Master Programs
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Manage program overview metadata, authorization status, and coordinator assignments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => navigate("/admin/itineraries")}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-xs hover:bg-emerald-50"
          >
            <Map size={15} />
            <span>Itinerary Builder</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-900 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-emerald-800 active:scale-95"
          >
            <Plus size={16} className="text-amber-300" />
            <span>Create New Program</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by tour title, industry, or destination..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none shadow-sm"
        />
      </div>

      {/* Tours Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center text-xs text-gray-500">
          No tour programs match your search.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((tour) => (
            <div
              key={tour.id}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md sm:p-7 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                        tour.status === "Published"
                          ? "bg-emerald-100 text-emerald-900"
                          : tour.status === "Draft"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {tour.status}
                    </span>
                    {tour.department && (
                      <span className="text-xs text-gray-500">• {tour.department}</span>
                    )}
                  </div>

                  <h2 className="mt-2 text-lg font-bold text-emerald-950 sm:text-xl">
                    {tour.title}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                    {tour.host && (
                      <span className="flex items-center gap-1">
                        <Building2 size={14} className="text-emerald-700 shrink-0" />
                        {tour.host}
                      </span>
                    )}
                    {tour.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} className="text-emerald-700 shrink-0" />
                        {tour.location}
                      </span>
                    )}
                    {(tour.startDate || tour.endDate) && (
                      <span className="flex items-center gap-1 font-bold text-emerald-950">
                        <Calendar size={14} className="shrink-0" />
                        {tour.startDate} to {tour.endDate}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  {tour.status === "Draft" ? (
                    <button
                      type="button"
                      onClick={() => toggleStatus(tour.id, "Published")}
                      className="rounded-xl bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-900"
                    >
                      Authorize &amp; Publish
                    </button>
                  ) : tour.status === "Published" ? (
                    <button
                      type="button"
                      onClick={() => toggleStatus(tour.id, "Draft")}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Move to Draft
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => openEditModal(tour)}
                    aria-label={`Edit ${tour.title}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(tour)}
                    aria-label={`Delete ${tour.title}`}
                    className="inline-flex items-center rounded-xl border border-red-200 bg-white p-2 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-gray-100 pt-4 text-xs">
                <div className="rounded-xl bg-gray-50 p-2.5">
                  <span className="text-gray-400 font-semibold uppercase text-[10px]">Lead Coordinator</span>
                  <p className="mt-0.5 font-bold text-emerald-950">{tour.leadCoordinator || "Unassigned"}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-2.5">
                  <span className="text-gray-400 font-semibold uppercase text-[10px]">Sanctioned Budget</span>
                  <p className="mt-0.5 font-bold text-emerald-950">{tour.budget || "TBC"}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-2.5">
                  <span className="text-gray-400 font-semibold uppercase text-[10px]">Planned Capacity</span>
                  <p className="mt-0.5 font-bold text-emerald-950">
                    {tour.capacity ? `${tour.capacity} Students` : "TBC"}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-2.5">
                  <span className="text-gray-400 font-semibold uppercase text-[10px]">Statutory Permit</span>
                  <p className="mt-0.5 font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    {tour.complianceCleared ? "Legally Cleared" : "Pending Clearance"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={editingTour ? "Edit Tour Program" : "Create Master Tour Program"}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base">
                {editingTour ? "Edit Tour Program" : "Create Master Tour Program"}
              </h3>
              <button
                type="button"
                aria-label="Close tour modal"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700">Tour Program Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Industrial Visit 2026 — Rajasthan & Delhi"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-gray-700">Industries / Host Institutions</label>
                  <input
                    type="text"
                    placeholder="e.g. Odoo India, Sense Electricals, IIT Delhi"
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700">Destination Route</label>
                  <input
                    type="text"
                    placeholder="e.g. Ahmedabad → Udaipur → Delhi"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-gray-700">Department / Batch</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700">Lead Coordinator</label>
                  <input
                    type="text"
                    value={form.leadCoordinator}
                    onChange={(e) => setForm({ ...form, leadCoordinator: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div>
                  <label className="block font-bold text-gray-700">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700">End Date *</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700">Capacity</label>
                  <input
                    type="number"
                    min={0}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700">Budget</label>
                  <input
                    type="text"
                    placeholder="TBC"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 font-bold text-gray-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.complianceCleared}
                  onChange={(e) => setForm({ ...form, complianceCleared: e.target.checked })}
                  className="h-4 w-4 rounded text-emerald-700"
                />
                <span>Statutory &amp; transit compliance cleared</span>
              </label>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-800 px-5 py-2 font-bold text-white shadow-sm hover:bg-emerald-900"
                >
                  {editingTour ? "Save Changes" : "Create Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
