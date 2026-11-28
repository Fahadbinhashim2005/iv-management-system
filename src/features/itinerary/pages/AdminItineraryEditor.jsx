import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Globe,
  EyeOff,
  Save,
  Loader2,
  X,
} from "lucide-react";
import { itineraryApi } from "../api/itineraryApi";
import { useItinerary } from "../hooks/useItinerary";
import { format12h, formatShortDate } from "../lib/time";
import ImageUploader from "../components/ImageUploader";
import StopEditorSheet from "../components/StopEditorSheet";
import LiveBanner from "../components/LiveBanner";
import ItineraryView from "../components/ItineraryView";
import StopLiveActions from "../components/StopLiveActions";
import ChangesLogPanel from "../components/ChangesLogPanel";

export default function AdminItineraryEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: itinerary, loading, error, refresh } = useItinerary(id, { staffView: true });
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Header metadata form
  const [metaForm, setMetaForm] = useState({
    title: "",
    subtitle: "",
    start_date: "",
    end_date: "",
    cover_image_path: "",
    cover_alt: "",
  });
  const [savingMeta, setSavingMeta] = useState(false);

  // Day metadata form
  const [dayForm, setDayForm] = useState({
    title: "",
    subtitle: "",
    date: "",
    hero_image_path: "",
    hero_alt: "",
    hero_blur: "",
    focal_x: 50,
    focal_y: 50,
  });
  const [savingDay, setSavingDay] = useState(false);

  // Modals
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [editingStop, setEditingStop] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'day'|'stop', id, label }
  const [changesRefreshKey, setChangesRefreshKey] = useState(0);

  const days = itinerary?.days || [];
  const safeDayIdx = Math.min(selectedDayIdx, Math.max(0, days.length - 1));
  const currentDay = days[safeDayIdx] || null;

  useEffect(() => {
    if (!itinerary) return;
    const t = setTimeout(() => {
      setMetaForm({
        title: itinerary.title || "",
        subtitle: itinerary.subtitle || "",
        start_date: itinerary.start_date || "",
        end_date: itinerary.end_date || "",
        cover_image_path: itinerary.cover_image_path || "",
        cover_alt: itinerary.cover_alt || "",
      });
    }, 0);
    return () => clearTimeout(t);
  }, [itinerary]);

  useEffect(() => {
    if (!currentDay) return;
    const t = setTimeout(() => {
      setDayForm({
        title: currentDay.title || "",
        subtitle: currentDay.subtitle || "",
        date: currentDay.date || "",
        hero_image_path: currentDay.hero_image_path || "",
        hero_alt: currentDay.hero_alt || "",
        hero_blur: currentDay.hero_blur || "",
        focal_x: currentDay.focal_x ?? 50,
        focal_y: currentDay.focal_y ?? 50,
      });
    }, 0);
    return () => clearTimeout(t);
  }, [currentDay]);

  const handleApiError = useCallback((err, fallbackMsg) => {
    if (err?.code === "CONFLICT") {
      setConflict(true);
    }
    toast.error(err?.message || fallbackMsg);
  }, []);

  const handleSaveMeta = async (e) => {
    e.preventDefault();
    if (!metaForm.title.trim()) {
      toast.error("Itinerary title is required.");
      return;
    }
    if (!metaForm.start_date || !metaForm.end_date || metaForm.end_date < metaForm.start_date) {
      toast.error("End date must be on or after start date.");
      return;
    }
    setSavingMeta(true);
    try {
      await itineraryApi.updateItinerary(
        itinerary.id,
        {
          title: metaForm.title.trim(),
          subtitle: metaForm.subtitle.trim() || null,
          start_date: metaForm.start_date,
          end_date: metaForm.end_date,
          cover_image_path: metaForm.cover_image_path || null,
          cover_alt: metaForm.cover_alt.trim() || null,
        },
        itinerary.updated_at
      );
      setConflict(false);
      await refresh();
      toast.success(
        itinerary.status === "published"
          ? "Published — students see this instantly"
          : "Trip details saved."
      );
    } catch (err) {
      handleApiError(err, "Failed to update itinerary.");
    } finally {
      setSavingMeta(false);
    }
  };

  const handleTogglePublish = async () => {
    try {
      if (itinerary.status === "published") {
        await itineraryApi.unpublishItinerary(itinerary.id);
        toast.success("Moved itinerary to draft.");
      } else {
        await itineraryApi.publishItinerary(itinerary.id);
        toast.success("Published — students see this instantly");
      }
      await refresh();
    } catch (err) {
      handleApiError(err, "Failed to change publish status.");
    }
  };

  const handleAddDay = async () => {
    const nextNum = days.length + 1;
    const lastDate = days[days.length - 1]?.date || itinerary.start_date;
    const d = new Date(`${lastDate}T00:00:00Z`);
    if (days.length > 0 && !Number.isNaN(d.getTime())) {
      d.setUTCDate(d.getUTCDate() + 1);
    }
    const isoDate = Number.isNaN(d.getTime()) ? itinerary.start_date : d.toISOString().slice(0, 10);

    try {
      await itineraryApi.createDay({
        itinerary_id: itinerary.id,
        day_number: nextNum,
        date: isoDate,
        title: `Day ${nextNum}`,
      });
      await refresh();
      setSelectedDayIdx(days.length);
      toast.success(`Added Day ${nextNum}.`);
    } catch (err) {
      handleApiError(err, "Could not add day.");
    }
  };

  const handleMoveDay = async (dir) => {
    const targetIdx = safeDayIdx + dir;
    if (targetIdx < 0 || targetIdx >= days.length) return;
    const reordered = [...days];
    const [moved] = reordered.splice(safeDayIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    try {
      await itineraryApi.reorderDays(reordered);
      await refresh();
      setSelectedDayIdx(targetIdx);
      toast.success("Reordered days.");
    } catch (err) {
      handleApiError(err, "Failed to reorder days.");
    }
  };

  const handleSaveDay = async (e) => {
    e.preventDefault();
    if (!currentDay || !dayForm.title.trim()) {
      toast.error("Day title is required.");
      return;
    }
    setSavingDay(true);
    try {
      await itineraryApi.updateDay(
        currentDay.id,
        {
          title: dayForm.title.trim(),
          subtitle: dayForm.subtitle.trim() || null,
          date: dayForm.date,
          hero_image_path: dayForm.hero_image_path || null,
          hero_alt: dayForm.hero_alt.trim() || null,
          hero_blur: dayForm.hero_blur || null,
          focal_x: Number(dayForm.focal_x),
          focal_y: Number(dayForm.focal_y),
        },
        currentDay.updated_at
      );
      setConflict(false);
      await refresh();
      toast.success("Day highlight saved.");
    } catch (err) {
      handleApiError(err, "Failed to save day.");
    } finally {
      setSavingDay(false);
    }
  };

  const handleSaveStop = async (payload, existingStop) => {
    try {
      if (existingStop) {
        await itineraryApi.updateStop(existingStop.id, payload, existingStop.updated_at);
        toast.success(
          itinerary.status === "published"
            ? "Published — students see this instantly"
            : "Stop updated."
        );
      } else {
        await itineraryApi.createStop(payload);
        toast.success(
          itinerary.status === "published"
            ? "Stop added live."
            : "Stop added."
        );
      }
      setConflict(false);
      await refresh();
    } catch (err) {
      handleApiError(err, "Failed to save stop.");
      throw err;
    }
  };

  const handleMoveStop = async (idx, dir) => {
    if (!currentDay) return;
    const stops = [...(currentDay.stops || [])];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= stops.length) return;
    const [moved] = stops.splice(idx, 1);
    stops.splice(targetIdx, 0, moved);
    try {
      await itineraryApi.reorderStops(stops.map((s) => s.id));
      await refresh();
    } catch (err) {
      handleApiError(err, "Failed to reorder stops.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "day") {
        await itineraryApi.deleteDay(confirmDelete.id);
        setSelectedDayIdx(0);
        toast.success("Day removed.");
      } else {
        await itineraryApi.deleteStop(confirmDelete.id);
        toast.success("Stop removed.");
      }
      setConfirmDelete(null);
      await refresh();
    } catch (err) {
      handleApiError(err, "Delete failed.");
    }
  };

  if (loading && !itinerary) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-3xl bg-white p-12 text-xs font-semibold text-gray-600">
        <Loader2 size={18} className="animate-spin text-emerald-700" />
        <span>Loading itinerary editor...</span>
      </div>
    );
  }

  if (error && !itinerary) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center space-y-3">
        <p className="text-sm font-bold text-red-900">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="min-h-[44px] rounded-xl bg-red-700 px-5 py-2 text-xs font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-sm font-bold text-gray-700">
        Itinerary not found.
      </div>
    );
  }

  const dayStops = currentDay?.stops || [];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/admin/itineraries")}
            aria-label="Back to itinerary list"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Admin Editor • {itinerary.status}
            </p>
            <h1 className="truncate text-xl font-extrabold text-emerald-950 sm:text-2xl">
              {itinerary.title}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
          >
            <Eye size={15} />
            <span>Preview as Student</span>
          </button>

          <button
            type="button"
            onClick={handleTogglePublish}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold text-white shadow-xs ${
              itinerary.status === "published"
                ? "bg-gray-800 hover:bg-gray-900"
                : "bg-[#065F46] hover:bg-emerald-900"
            }`}
          >
            {itinerary.status === "published" ? <EyeOff size={15} /> : <Globe size={15} />}
            <span>{itinerary.status === "published" ? "Unpublish" : "Publish Live"}</span>
          </button>
        </div>
      </div>

      <LiveBanner
        isPublished={itinerary.status === "published"}
        conflict={conflict}
        onReload={() => {
          setConflict(false);
          refresh();
        }}
      />

      {/* Trip Metadata + Cover Photo */}
      <form
        onSubmit={handleSaveMeta}
        className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-gray-100 space-y-4 text-xs"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-emerald-950">Trip Header &amp; Cover</h2>
          <button
            type="submit"
            disabled={savingMeta}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#065F46] px-4 py-2 font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
          >
            <Save size={14} />
            <span>{savingMeta ? "Saving..." : "Save Trip"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-gray-800">Trip Title *</label>
            <input
              type="text"
              required
              maxLength={120}
              value={metaForm.title}
              onChange={(e) => setMetaForm({ ...metaForm, title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-800">Subtitle / Route</label>
            <input
              type="text"
              maxLength={160}
              value={metaForm.subtitle}
              onChange={(e) => setMetaForm({ ...metaForm, subtitle: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-800">Start Date *</label>
            <input
              type="date"
              required
              value={metaForm.start_date}
              onChange={(e) => setMetaForm({ ...metaForm, start_date: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-800">End Date *</label>
            <input
              type="date"
              required
              value={metaForm.end_date}
              onChange={(e) => setMetaForm({ ...metaForm, end_date: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
            />
          </div>
        </div>

        <ImageUploader
          itineraryId={itinerary.id}
          scope="cover"
          label="Fallback Trip Cover Photo"
          valuePath={metaForm.cover_image_path}
          altValue={metaForm.cover_alt}
          onAltChange={(val) => setMetaForm((prev) => ({ ...prev, cover_alt: val }))}
          onUploaded={(res) =>
            setMetaForm((prev) => ({ ...prev, cover_image_path: res.path }))
          }
          onRemoved={() => setMetaForm((prev) => ({ ...prev, cover_image_path: "" }))}
        />
      </form>

      {/* Day Tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-emerald-950">Days ({days.length})</h2>
          <button
            type="button"
            onClick={handleAddDay}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            <Plus size={14} /> Add Day
          </button>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {days.map((d, idx) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDayIdx(idx)}
              className={`min-h-[44px] shrink-0 rounded-2xl border px-4 py-2 text-left text-xs font-bold transition ${
                idx === safeDayIdx
                  ? "border-[#065F46] bg-[#065F46] text-white"
                  : "border-gray-200 bg-white text-gray-800 hover:bg-emerald-50"
              }`}
            >
              <div>Day {d.day_number}</div>
              <div className={`text-[10px] ${idx === safeDayIdx ? "text-emerald-100" : "text-gray-500"}`}>
                {formatShortDate(d.date)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Day Details + Stops */}
      {currentDay && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          {/* Day Details & Hero Focal Picker */}
          <form
            onSubmit={handleSaveDay}
            className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-4 text-xs self-start"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-emerald-950">
                Day {currentDay.day_number} Settings
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safeDayIdx === 0}
                  onClick={() => handleMoveDay(-1)}
                  aria-label="Move day left"
                  className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-gray-200 text-gray-700 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={safeDayIdx >= days.length - 1}
                  onClick={() => handleMoveDay(1)}
                  aria-label="Move day right"
                  className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-gray-200 text-gray-700 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmDelete({
                      type: "day",
                      id: currentDay.id,
                      label: `Day ${currentDay.day_number} (${currentDay.title})`,
                    })
                  }
                  aria-label={`Delete Day ${currentDay.day_number}`}
                  className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-800">Day Title (Hero headline) *</label>
              <input
                type="text"
                required
                maxLength={120}
                value={dayForm.title}
                onChange={(e) => setDayForm({ ...dayForm, title: e.target.value })}
                placeholder="e.g. Udaipur"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-800">Day Subtitle</label>
              <input
                type="text"
                maxLength={160}
                value={dayForm.subtitle}
                onChange={(e) => setDayForm({ ...dayForm, subtitle: e.target.value })}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-800">Date *</label>
              <input
                type="date"
                required
                value={dayForm.date}
                onChange={(e) => setDayForm({ ...dayForm, date: e.target.value })}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
              />
            </div>

            <ImageUploader
              itineraryId={itinerary.id}
              scope={`day-${currentDay.id}`}
              label="Day Highlight Hero Photo"
              valuePath={dayForm.hero_image_path}
              altValue={dayForm.hero_alt}
              onAltChange={(val) => setDayForm((prev) => ({ ...prev, hero_alt: val }))}
              focalX={dayForm.focal_x}
              focalY={dayForm.focal_y}
              enableFocalPicker={true}
              onFocalChange={(x, y) =>
                setDayForm((prev) => ({ ...prev, focal_x: x, focal_y: y }))
              }
              onUploaded={(res) =>
                setDayForm((prev) => ({
                  ...prev,
                  hero_image_path: res.path,
                  hero_blur: res.blurDataUrl || "",
                }))
              }
              onRemoved={() =>
                setDayForm((prev) => ({
                  ...prev,
                  hero_image_path: "",
                  hero_blur: "",
                }))
              }
            />

            <button
              type="submit"
              disabled={savingDay}
              className="w-full min-h-[44px] rounded-xl bg-[#065F46] py-2.5 font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
            >
              {savingDay ? "Saving Day..." : "Save Day Settings"}
            </button>
          </form>

          {/* Stops Manager */}
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-emerald-950">
                Stops for Day {currentDay.day_number} ({dayStops.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingStop(null);
                  setStopModalOpen(true);
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#065F46] px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-900"
              >
                <Plus size={15} /> Add Stop
              </button>
            </div>

            {dayStops.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-8 text-center text-xs text-gray-600">
                No stops added for this day yet. Tap <strong>Add Stop</strong> to begin.
              </div>
            ) : (
              <div className="space-y-2.5">
                {dayStops.map((stop, idx) => (
                  <div
                    key={stop.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3.5 text-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-emerald-800">
                            {stop.time_tbc || !stop.start_time
                              ? "TBC"
                              : format12h(stop.start_time)}
                          </span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-gray-700 ring-1 ring-gray-200">
                            {stop.category}
                          </span>
                          {stop.status_override && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                              {stop.status_override}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate font-extrabold text-emerald-950 text-sm">
                          {stop.title}
                        </p>
                        {stop.location && (
                          <p className="truncate text-[11px] text-gray-600">{stop.location}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStop(idx, -1)}
                          aria-label={`Move ${stop.title} up`}
                          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 disabled:opacity-40"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={idx >= dayStops.length - 1}
                          onClick={() => handleMoveStop(idx, 1)}
                          aria-label={`Move ${stop.title} down`}
                          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 disabled:opacity-40"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStop(stop);
                            setStopModalOpen(true);
                          }}
                          aria-label={`Edit ${stop.title}`}
                          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDelete({
                              type: "stop",
                              id: stop.id,
                              label: stop.title,
                            })
                          }
                          aria-label={`Delete ${stop.title}`}
                          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-red-200 bg-white text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-200/70 pt-2">
                      <StopLiveActions
                        stop={stop}
                        onChanged={async () => {
                          await refresh();
                          setChangesRefreshKey((k) => k + 1);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Changes Audit Panel */}
      <ChangesLogPanel itineraryId={itinerary.id} refreshKey={changesRefreshKey} />

      {/* Stop Editor Sheet */}
      {currentDay && (
        <StopEditorSheet
          isOpen={stopModalOpen}
          onClose={() => setStopModalOpen(false)}
          itineraryId={itinerary.id}
          dayId={currentDay.id}
          initialStop={editingStop}
          nextSequence={(dayStops[dayStops.length - 1]?.sequence_no ?? 0) + 1}
          onSave={handleSaveStop}
        />
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm deletion"
          onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-red-800">Confirm Removal</h3>
            <p className="text-gray-700">
              Remove <strong>{confirmDelete.label}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="min-h-[44px] rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="min-h-[44px] rounded-xl bg-red-700 px-4 py-2 font-bold text-white hover:bg-red-800"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview as Student Phone Frame */}
      {showPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Preview as student"
          onClick={(e) => e.target === e.currentTarget && setShowPreview(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 backdrop-blur-xs"
        >
          <div className="relative flex max-h-[92dvh] w-full max-w-[410px] flex-col overflow-hidden rounded-[36px] border-4 border-gray-900 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gray-900 px-4 py-2.5 text-xs font-bold text-white">
              <span>Student Mobile Preview (390 px)</span>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                aria-label="Close preview"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto px-3 pt-5 pb-6">
              <ItineraryView
                itinerary={itinerary}
                showStaffNote={false}
                showBackButton={false}
                previewFrame={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
