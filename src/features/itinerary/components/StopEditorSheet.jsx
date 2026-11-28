import { useEffect, useState } from "react";
import { X, Crosshair, Link2 } from "lucide-react";
import toast from "react-hot-toast";
import { parseGoogleMapsUrl } from "../lib/mapsLink";
import ImageUploader from "./ImageUploader";

const CATEGORIES = [
  { value: "travel", label: "Travel / Transit" },
  { value: "stay", label: "Hotel / Stay" },
  { value: "industry", label: "Industry Visit" },
  { value: "activity", label: "Sightseeing / Activity" },
  { value: "meal", label: "Meal / Break" },
  { value: "free", label: "Free Time" },
];

export default function StopEditorSheet({
  isOpen,
  onClose,
  itineraryId,
  dayId,
  initialStop = null,
  nextSequence = 1,
  onSave,
}) {
  const [form, setForm] = useState({
    title: "",
    location: "",
    category: "activity",
    start_time: "",
    end_time: "",
    time_tbc: false,
    description: "",
    staff_note: "",
    image_path: "",
    image_alt: "",
    lat: "",
    lng: "",
    is_highlight: false,
  });
  const [mapsPaste, setMapsPaste] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      if (initialStop) {
        setForm({
          title: initialStop.title || "",
          location: initialStop.location || "",
          category: initialStop.category || "activity",
          start_time: initialStop.start_time ? String(initialStop.start_time).slice(0, 5) : "",
          end_time: initialStop.end_time ? String(initialStop.end_time).slice(0, 5) : "",
          time_tbc: Boolean(initialStop.time_tbc),
          description: initialStop.description || "",
          staff_note: initialStop.staff_note || "",
          image_path: initialStop.image_path || "",
          image_alt: initialStop.image_alt || "",
          lat: initialStop.lat ?? "",
          lng: initialStop.lng ?? "",
          is_highlight: Boolean(initialStop.is_highlight),
        });
      } else {
        setForm({
          title: "",
          location: "",
          category: "activity",
          start_time: "",
          end_time: "",
          time_tbc: false,
          description: "",
          staff_note: "",
          image_path: "",
          image_alt: "",
          lat: "",
          lng: "",
          is_highlight: false,
        });
      }
      setMapsPaste("");
      setErrors({});
    }, 0);
    return () => clearTimeout(t);
  }, [isOpen, initialStop]);

  if (!isOpen) return null;

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        }));
        toast.success("Coordinates filled from current GPS.");
      },
      () => toast.error("Could not access GPS location.")
    );
  };

  const handleParseMapsLink = () => {
    const coords = parseGoogleMapsUrl(mapsPaste);
    if (!coords) {
      setErrors((prev) => ({
        ...prev,
        maps: "Could not find coordinates in that Google Maps link.",
      }));
      return;
    }
    setErrors((prev) => ({ ...prev, maps: null, lat: null, lng: null }));
    setForm((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
    toast.success("Extracted coordinates from Google Maps link.");
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = "Stop title is required.";
    if (form.title.trim().length > 120) next.title = "Max 120 characters.";
    if (form.lat !== "" && (Number.isNaN(Number(form.lat)) || Number(form.lat) < -90 || Number(form.lat) > 90)) {
      next.lat = "Latitude must be between -90 and 90.";
    }
    if (form.lng !== "" && (Number.isNaN(Number(form.lng)) || Number(form.lng) < -180 || Number(form.lng) > 180)) {
      next.lng = "Longitude must be between -180 and 180.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        itinerary_id: itineraryId,
        day_id: dayId,
        sequence_no: initialStop ? initialStop.sequence_no : nextSequence,
        title: form.title.trim(),
        location: form.location.trim() || null,
        category: form.category,
        start_time: form.time_tbc ? null : form.start_time || null,
        end_time: form.time_tbc ? null : form.end_time || null,
        time_tbc: form.time_tbc,
        description: form.description.trim() || null,
        staff_note: form.staff_note.trim() || null,
        image_path: form.image_path || null,
        image_alt: form.image_alt.trim() || null,
        lat: form.lat === "" ? null : Number(form.lat),
        lng: form.lng === "" ? null : Number(form.lng),
        is_highlight: Boolean(form.is_highlight),
      };
      await onSave(payload, initialStop);
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to save stop.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={initialStop ? "Edit Stop" : "Add Stop"}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4 backdrop-blur-xs"
    >
      <div className="w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-base font-extrabold text-emerald-950">
            {initialStop ? "Edit Stop" : "Add New Stop"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close stop editor"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-800">Stop Title *</label>
            <input
              type="text"
              maxLength={120}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. City Palace Tour"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
            />
            {errors.title && <p className="mt-1 text-red-700 font-semibold">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-800">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-gray-800">Location / Venue</label>
              <input
                type="text"
                maxLength={160}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Udaipur, Rajasthan"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
              />
            </div>
          </div>

          {/* Time & TBC */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3 space-y-2.5">
            <label className="inline-flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={form.time_tbc}
                onChange={(e) => setForm({ ...form, time_tbc: e.target.checked })}
                className="h-4 w-4 rounded text-emerald-700"
              />
              <span>Time TBC (To Be Confirmed)</span>
            </label>

            {!form.time_tbc && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700">Start Time</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700">End Time</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-gray-800">Description</label>
            <textarea
              rows={3}
              maxLength={1000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Visitor guidelines, instructions, or highlights..."
              className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-gray-900"
            />
          </div>

          <div>
            <label className="block font-bold text-amber-900">
              Staff Note (visible to coordinators &amp; admins only)
            </label>
            <textarea
              rows={2}
              maxLength={300}
              value={form.staff_note}
              onChange={(e) => setForm({ ...form, staff_note: e.target.value })}
              placeholder="Internal contact or gate note (never shown to students)..."
              className="mt-1 w-full rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-gray-900"
            />
          </div>

          {/* Coordinates helper */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-gray-800">Map Coordinates (optional)</span>
              <button
                type="button"
                onClick={handleUseGps}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-bold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50"
              >
                <Crosshair size={13} /> Use my current location
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={mapsPaste}
                onChange={(e) => setMapsPaste(e.target.value)}
                placeholder="Paste Google Maps link..."
                className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900"
              />
              <button
                type="button"
                onClick={handleParseMapsLink}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-xl bg-emerald-800 px-3 py-2 font-bold text-white hover:bg-emerald-900"
              >
                <Link2 size={13} /> Extract
              </button>
            </div>
            {errors.maps && <p className="text-red-700 font-semibold">{errors.maps}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900"
                />
                {errors.lat && <p className="mt-1 text-red-700 font-semibold">{errors.lat}</p>}
              </div>
              <div>
                <label className="block font-bold text-gray-700">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900"
                />
                {errors.lng && <p className="mt-1 text-red-700 font-semibold">{errors.lng}</p>}
              </div>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_highlight}
              onChange={(e) => setForm({ ...form, is_highlight: e.target.checked })}
              className="h-4 w-4 rounded text-emerald-700"
            />
            <span>Highlight stop (can supply the day&apos;s hero image)</span>
          </label>

          <ImageUploader
            itineraryId={itineraryId}
            scope={`stop-${initialStop?.id || "new"}`}
            label="Stop Photo (optional)"
            valuePath={form.image_path}
            altValue={form.image_alt}
            onAltChange={(val) => setForm((prev) => ({ ...prev, image_alt: val }))}
            onUploaded={(res) =>
              setForm((prev) => ({ ...prev, image_path: res.path }))
            }
            onRemoved={() => setForm((prev) => ({ ...prev, image_path: "" }))}
          />

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-xl bg-[#065F46] px-5 py-2 font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
            >
              {saving ? "Saving..." : initialStop ? "Save & Publish" : "Add Stop"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
