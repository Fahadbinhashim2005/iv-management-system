import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Plus,
  Copy,
  CheckCircle2,
  Archive,
  Trash2,
  Edit3,
  Globe,
  EyeOff,
  Star,
  Calendar,
  Loader2,
  X,
} from "lucide-react";
import { getMediaUrls, itineraryApi } from "../api/itineraryApi";
import { formatShortDate } from "../lib/time";

export default function AdminItineraryList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    subtitle: "",
    start_date: "",
    end_date: "",
  });
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await itineraryApi.listAll();
      setItems(data);
    } catch (err) {
      setError(err?.message || "Could not load itineraries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadList, 0);
    return () => clearTimeout(t);
  }, [loadList]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      toast.error("Trip title is required.");
      return;
    }
    if (!createForm.start_date || !createForm.end_date || createForm.end_date < createForm.start_date) {
      toast.error("End date must be on or after start date.");
      return;
    }
    setCreating(true);
    try {
      const created = await itineraryApi.createItinerary(createForm);
      toast.success("Itinerary created in draft mode.");
      setShowCreate(false);
      setCreateForm({ title: "", subtitle: "", start_date: "", end_date: "" });
      navigate(`/admin/itineraries/${created.id}`);
    } catch (err) {
      toast.error(err?.message || "Failed to create itinerary.");
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (item) => {
    try {
      await itineraryApi.duplicateItinerary(item.id);
      toast.success(`Duplicated "${item.title}".`);
      loadList();
    } catch (err) {
      toast.error(err?.message || "Failed to duplicate itinerary.");
    }
  };

  const handleTogglePublish = async (item) => {
    try {
      if (item.status === "published") {
        await itineraryApi.unpublishItinerary(item.id);
        toast.success("Moved back to draft.");
      } else {
        await itineraryApi.publishItinerary(item.id);
        toast.success("Published to students.");
      }
      loadList();
    } catch (err) {
      toast.error(err?.message || "Failed to update publish status.");
    }
  };

  const handleSetActive = async (item) => {
    try {
      await itineraryApi.setActive(item.id);
      toast.success(`"${item.title}" is now the active trip.`);
      loadList();
    } catch (err) {
      toast.error(err?.message || "Failed to switch active itinerary.");
    }
  };

  const handleArchive = async (item) => {
    try {
      await itineraryApi.archiveItinerary(item.id);
      toast.success(`Archived "${item.title}".`);
      loadList();
    } catch (err) {
      toast.error(err?.message || "Failed to archive itinerary.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText.trim() !== "DELETE") {
      toast.error("Type DELETE to confirm.");
      return;
    }
    setDeleting(true);
    try {
      await itineraryApi.deleteItinerary(deleteTarget.id);
      toast.success(`Deleted "${deleteTarget.title}".`);
      setDeleteTarget(null);
      setDeleteConfirmText("");
      loadList();
    } catch (err) {
      toast.error(err?.message || "Failed to delete itinerary.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Trip Administration</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Itinerary Builder
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600">
            Create, photograph, publish, and manage live day-by-day trip schedules.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-xl bg-[#065F46] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-900 sm:self-auto"
        >
          <Plus size={16} />
          <span>New Itinerary</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl bg-white p-12 text-xs font-semibold text-gray-600 shadow-xs">
          <Loader2 size={18} className="animate-spin text-emerald-700" />
          <span>Loading itineraries...</span>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
          <p className="text-xs font-bold text-red-900">{error}</p>
          <button
            type="button"
            onClick={loadList}
            className="min-h-[44px] rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center space-y-3">
          <Calendar size={34} className="mx-auto text-emerald-700 opacity-60" />
          <h2 className="text-base font-bold text-emerald-950">No itineraries created yet</h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto">
            Create your first trip itinerary to generate day tabs, upload highlight photos, and add stops.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#065F46] px-5 py-2.5 text-xs font-bold text-white"
          >
            <Plus size={15} /> Create Itinerary
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => {
            const { thumbUrl } = getMediaUrls(item.cover_image_path);
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100 flex flex-col justify-between"
              >
                <div>
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={item.cover_alt || item.title}
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 items-center justify-center bg-gradient-to-r from-[#065F46] to-[#10B981] text-white/80">
                      <Calendar size={32} />
                    </div>
                  )}

                  <div className="p-5 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                          item.status === "published"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === "archived"
                            ? "bg-gray-200 text-gray-700"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.is_active && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                          <Star size={10} className="text-amber-300" /> Active
                        </span>
                      )}
                      <span className="text-xs font-semibold text-gray-600">
                        {formatShortDate(item.start_date)} – {formatShortDate(item.end_date)}
                      </span>
                    </div>

                    <h2 className="text-lg font-extrabold text-emerald-950">{item.title}</h2>
                    {item.subtitle && (
                      <p className="text-xs text-gray-600 line-clamp-2">{item.subtitle}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 bg-gray-50/70 px-4 py-3 text-xs">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/itineraries/${item.id}`)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#065F46] px-3.5 py-2 font-bold text-white hover:bg-emerald-900"
                  >
                    <Edit3 size={14} /> Edit
                  </button>

                  {item.status !== "archived" && (
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(item)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 font-bold text-gray-800 hover:bg-gray-100"
                    >
                      {item.status === "published" ? <EyeOff size={14} /> : <Globe size={14} />}
                      <span>{item.status === "published" ? "Unpublish" : "Publish"}</span>
                    </button>
                  )}

                  {!item.is_active && item.status === "published" && (
                    <button
                      type="button"
                      onClick={() => handleSetActive(item)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-bold text-emerald-900 hover:bg-emerald-100"
                    >
                      <CheckCircle2 size={14} /> Set Active
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDuplicate(item)}
                    aria-label={`Duplicate ${item.title}`}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-2 font-bold text-gray-700 hover:bg-gray-100"
                    title="Duplicate"
                  >
                    <Copy size={14} />
                  </button>

                  {item.status !== "archived" && (
                    <button
                      type="button"
                      onClick={() => handleArchive(item)}
                      aria-label={`Archive ${item.title}`}
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-2 font-bold text-gray-700 hover:bg-gray-100"
                      title="Archive"
                    >
                      <Archive size={14} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(item);
                      setDeleteConfirmText("");
                    }}
                    aria-label={`Delete ${item.title}`}
                    className="ml-auto inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-red-200 bg-white px-2.5 py-2 font-bold text-red-700 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Itinerary Modal */}
      {showCreate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="New Itinerary"
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-emerald-950">Create New Itinerary</h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                aria-label="Close modal"
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-800">Trip Title *</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Industrial Visit 2026"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800">Subtitle / Route</label>
                <input
                  type="text"
                  maxLength={160}
                  value={createForm.subtitle}
                  onChange={(e) => setCreateForm({ ...createForm, subtitle: e.target.value })}
                  placeholder="e.g. Kottayam → Ahmedabad → Udaipur → Delhi"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-800">End Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.end_date}
                    onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="min-h-[44px] rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="min-h-[44px] rounded-xl bg-[#065F46] px-5 py-2 font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
                >
                  {creating ? "Creating..." : "Create Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Typed Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Delete Itinerary"
          onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-red-800">Delete Itinerary</h3>
            <p className="text-gray-700 leading-relaxed">
              This will permanently delete <strong>{deleteTarget.title}</strong> and all of its days and stops. Type <strong>DELETE</strong> below to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full rounded-xl border border-red-200 px-3 py-2.5 text-gray-900"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-[44px] rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting || deleteConfirmText.trim() !== "DELETE"}
                onClick={handleDelete}
                className="min-h-[44px] rounded-xl bg-red-700 px-4 py-2 font-bold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
