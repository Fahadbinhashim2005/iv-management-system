import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Bell,
  Trash2,
  Clock,
  Send,
  Pin,
  MapPin,
  ExternalLink,
  Volume2,
  ListChecks,
  RefreshCw,
} from "lucide-react";
import { updatesApi } from "../../features/updates/api/updatesApi";

const CATEGORY_LABELS = {
  urgent: "Urgent",
  logistics: "Logistics",
  general: "General",
  info: "Info",
};

export default function CoordinatorAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("urgent");
  const [newContent, setNewContent] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
  const [isPinned, setIsPinned] = useState(false);
  const [playSound, setPlaySound] = useState(true);

  const loadAnnouncements = useCallback(async () => {
    try {
      const data = await updatesApi.getAll();
      setAnnouncements(data || []);
    } catch (err) {
      toast.error(err.message || "Failed to load broadcasts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadAnnouncements, 0);
    return () => clearTimeout(t);
  }, [loadAnnouncements]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLocationLat(lat);
        setLocationLng(lng);
        setLocationUrl(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
        if (!locationName) setLocationName(`Pinned GPS (${lat}, ${lng})`);
        toast.success("Current GPS location attached for Google Maps!");
      },
      () => toast.error("Unable to get GPS location. Please allow location permission.")
    );
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setSubmitting(true);
    try {
      const created = await updatesApi.broadcast({
        title: newTitle.trim(),
        category: newCategory,
        content: newContent.trim(),
        instructions: newInstructions.trim() || null,
        locationName: locationName.trim() || null,
        locationUrl: locationUrl.trim() || null,
        locationLat,
        locationLng,
        isPinned,
        playSound,
      });
      setAnnouncements((prev) => [created, ...prev]);
      setNewTitle("");
      setNewContent("");
      setNewInstructions("");
      setLocationName("");
      setLocationUrl("");
      setLocationLat(null);
      setLocationLng(null);
      setIsPinned(false);
      toast.success("Notice published. Students see it within a few seconds while the app is open.");
    } catch (err) {
      toast.error(err.message || "Failed to broadcast notice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async (item) => {
    try {
      const updated = await updatesApi.togglePin(item.id, !item.isPinned);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, isPinned: updated.isPinned } : a))
      );
      toast.success(updated.isPinned ? "Pinned to top" : "Unpinned");
    } catch (err) {
      toast.error(err.message || "Failed to update pin");
    }
  };

  const handleDelete = async (id) => {
    try {
      await updatesApi.remove(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Broadcast removed");
    } catch (err) {
      toast.error(err.message || "Failed to delete broadcast");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Broadcast Control</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Publish Notices &amp; Live Locations
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Publish instructions, Google Maps locations, and in-app alerts that students receive while the app is open.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAnnouncements}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[430px_minmax(0,1fr)]">
        {/* Post Form Card */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-emerald-800" />
            <h3 className="font-extrabold text-emerald-950 text-sm">Create Broadcast</h3>
          </div>

          <form onSubmit={handlePost} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-700">Notice Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
              >
                <option value="urgent">Urgent Action Required</option>
                <option value="logistics">Travel &amp; Logistics</option>
                <option value="general">General Notice</option>
                <option value="info">Academic Briefing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700">Notice Title</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={160}
                placeholder="e.g. Assemble at Bus Bay #2"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700">Message</label>
              <textarea
                rows={3}
                required
                placeholder="Type the main announcement message..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                <ListChecks size={14} className="text-emerald-700" />
                Instructions for Students (optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Carry College ID, wear formal shoes, board by 6:15 AM."
                value={newInstructions}
                onChange={(e) => setNewInstructions(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {/* Google Maps Location */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-950">
                  <MapPin size={14} className="text-emerald-700" />
                  Google Maps Location (optional)
                </span>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline"
                >
                  Use My GPS
                </button>
              </div>

              <input
                type="text"
                placeholder="Location / Venue name (e.g. Kottayam Railway Station)"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
              />

              <input
                type="url"
                placeholder="Google Maps link (auto-generated if left blank)"
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={playSound}
                  onChange={(e) => setPlaySound(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-700"
                />
                <Volume2 size={14} className="text-emerald-700" />
                Play special alert sound
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-700"
                />
                Pin to top
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-emerald-800 py-3 text-xs font-extrabold text-white shadow-md transition hover:bg-emerald-900 active:scale-95 disabled:opacity-60"
            >
              <Send size={15} />
              <span>{submitting ? "Sending Broadcast..." : "Broadcast Notice & Alert Students"}</span>
            </button>
          </form>
        </div>

        {/* Active Broadcasts Feed */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-emerald-950 text-sm">
            Active Broadcasts ({announcements.length})
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-white motion-safe:animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-500">
              No broadcasts sent yet. Use the form to alert students.
            </div>
          ) : (
            <div className="space-y-3.5">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          item.category === "urgent"
                            ? "bg-red-100 text-red-800"
                            : item.category === "logistics"
                            ? "bg-blue-100 text-blue-800"
                            : item.category === "info"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                      {item.isPinned && (
                        <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                          <Pin size={11} /> Pinned
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock size={12} />
                        {new Date(item.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(item)}
                        aria-label={item.isPinned ? `Unpin ${item.title}` : `Pin ${item.title}`}
                        className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1.5 transition ${
                          item.isPinned
                            ? "bg-amber-50 text-amber-700"
                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        }`}
                        title={item.isPinned ? "Unpin" : "Pin"}
                      >
                        <Pin size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        aria-label={`Delete ${item.title}`}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                        title="Delete notice"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <h4 className="mt-2 text-sm font-bold text-emerald-950 sm:text-base">
                    {item.title}
                  </h4>

                  <p className="mt-1 text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                    {item.content}
                  </p>

                  {item.instructions && (
                    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-950">
                      <p className="font-bold flex items-center gap-1.5 mb-1">
                        <ListChecks size={14} className="text-emerald-700" /> Instructions
                      </p>
                      <p className="whitespace-pre-line">{item.instructions}</p>
                    </div>
                  )}

                  {item.locationUrl && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <a
                        href={item.locationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
                      >
                        <MapPin size={14} />
                        <span>{item.locationName || "Open in Google Maps"}</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}

                  <p className="mt-3 text-[11px] text-gray-400">
                    Signed by <strong className="text-gray-700">{item.author}</strong>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
