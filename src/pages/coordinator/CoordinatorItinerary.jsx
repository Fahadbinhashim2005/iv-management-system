import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  Coffee,
  Bus,
  Info,
  Search,
  Plus,
  Trash2,
  Bell,
  X,
} from "lucide-react";
import { tripConfig } from "../../config/tripConfig";
import { updatesApi } from "../../features/updates/api/updatesApi";
import {
  loadSharedItinerary,
  addSharedItineraryEvent,
  deleteSharedItineraryEvent,
} from "../../utils/itineraryStore";

const CATEGORIES = ["All", "Industry", "Travel", "Stay", "Activity"];

function getCategoryIcon(category) {
  if (category === "Travel") return Bus;
  if (category === "Stay" || category === "Industry") return Building2;
  if (category === "Activity") return Coffee;
  return Info;
}

export default function CoordinatorItinerary() {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [days, setDays] = useState([]);
  const [visitId, setVisitId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const fetchItinerary = useCallback(async () => {
    try {
      const res = await loadSharedItinerary();
      setDays(res.days || []);
      setVisitId(res.visitId || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchItinerary, 0);
    return () => clearTimeout(t);
  }, [fetchItinerary]);

  useEffect(() => {
    if (!showAddModal) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowAddModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showAddModal]);

  const [newEvent, setNewEvent] = useState({
    time: "",
    activity: "",
    location: "",
    category: "Industry",
    inCharge: "Coordinators",
    details: "",
  });

  const currentDay = days[selectedDayIndex] || days[0];
  const filteredEvents = currentDay
    ? currentDay.events.filter((ev) => {
        const matchesCategory =
          selectedCategory === "All" || ev.category === selectedCategory;
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          ev.activity.toLowerCase().includes(q) ||
          ev.location.toLowerCase().includes(q) ||
          (ev.details || "").toLowerCase().includes(q) ||
          (ev.inCharge || "").toLowerCase().includes(q);
        return matchesCategory && matchesSearch;
      })
    : [];

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!currentDay) return;
    setSaving(true);
    try {
      await addSharedItineraryEvent({
        visitId,
        dayIndex: selectedDayIndex,
        currentDays: days,
        newEvent,
      });
      await fetchItinerary();
      setShowAddModal(false);
      setNewEvent({
        time: "",
        activity: "",
        location: "",
        category: "Industry",
        inCharge: "Coordinators",
        details: "",
      });
      toast.success(`Added "${newEvent.activity}" to ${currentDay.day}.`);
    } catch (err) {
      toast.error(err?.message || "Could not save itinerary item to database.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id, title) => {
    try {
      await deleteSharedItineraryEvent(id);
      await fetchItinerary();
      toast.success(`Removed "${title}" from ${currentDay.day}.`);
    } catch (err) {
      toast.error(err?.message || "Could not remove itinerary item from database.");
    }
  };

  const handleBroadcastItineraryUpdate = async () => {
    if (!currentDay) return;
    setBroadcasting(true);
    try {
      await updatesApi.broadcast({
        title: `Itinerary updated for ${currentDay.day}`,
        category: "logistics",
        content: `Schedule updated for ${currentDay.day} (${currentDay.title}). Please check My Itinerary for the latest timings and venues.`,
        playSound: true,
      });
      toast.success("Notice published. Students see it within a few seconds while the app is open.");
    } catch (err) {
      toast.error(err?.message || "Failed to publish itinerary update notice.");
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Trip Schedule</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Industrial Visit Itinerary
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete day-by-day plan, timings, and venue details for {tripConfig.trip.displayName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={broadcasting || !currentDay}
            onClick={handleBroadcastItineraryUpdate}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-xs transition hover:bg-emerald-50 active:scale-95 disabled:opacity-60"
          >
            <Bell size={15} />
            <span>{broadcasting ? "Publishing..." : "Publish Update Notice"}</span>
          </button>

          <button
            type="button"
            disabled={!currentDay}
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900 active:scale-95 disabled:opacity-60"
          >
            <Plus size={15} />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-12 rounded-2xl bg-white motion-safe:animate-pulse ring-1 ring-gray-100" />
          <div className="h-36 rounded-2xl bg-white motion-safe:animate-pulse ring-1 ring-gray-100" />
        </div>
      ) : !currentDay ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-600">
          No itinerary days configured yet.
        </div>
      ) : (
        <>

      {/* Day Selector Tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {days.map((dayPlan, index) => {
          const isSelected = selectedDayIndex === index;
          return (
            <button
              key={dayPlan.day}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedDayIndex(index)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                isSelected
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-gray-600 ring-1 ring-gray-100 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              <Calendar size={16} />
              <span>{dayPlan.day}</span>
              <span className={`text-xs font-normal ${isSelected ? "text-emerald-100" : "text-gray-400"}`}>
                • {dayPlan.date}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Category Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search stops, venues, or leads..."
            aria-label="Search itinerary activities or venues"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs text-gray-900 shadow-xs focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                selectedCategory === cat
                  ? "bg-emerald-950 text-white shadow-xs"
                  : "bg-white text-gray-600 ring-1 ring-gray-100 hover:bg-emerald-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Day Overview Banner */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              {currentDay.day} Highlights
            </span>
            <h2 className="text-xl font-bold text-emerald-950">{currentDay.title}</h2>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {currentDay.events.length} Planned Activities
          </span>
        </div>
      </div>

      {/* Timeline Events */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-500">
          No activities match your current search or category filter on {currentDay.day}.
        </div>
      ) : (
        <div className="relative space-y-4 before:absolute before:bottom-3 before:left-10 before:top-3 before:w-0.5 before:bg-emerald-100">
          {filteredEvents.map((event) => {
            const EventIcon = getCategoryIcon(event.category);
            return (
              <div
                key={event.id}
                className="relative flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md"
              >
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <EventIcon size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-700">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={14} />
                        <span>{event.time}</span>
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {event.category}
                      </span>
                      {event.inCharge && (
                        <span className="text-[11px] font-medium text-gray-500">
                          • Lead: <strong className="text-gray-700">{event.inCharge}</strong>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(event.id, event.activity)}
                      aria-label={`Remove ${event.activity}`}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                      title="Remove activity"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <h3 className="mt-1.5 text-base font-bold text-emerald-950 sm:text-lg">
                    {event.activity}
                  </h3>

                  <div className="mt-1 flex items-start gap-1.5 text-xs text-gray-500">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span className="break-words">{event.location}</span>
                  </div>

                  {event.details && (
                    <p className="mt-2 text-xs leading-relaxed text-gray-600 sm:text-sm">
                      {event.details}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Activity Modal */}
      {showAddModal && currentDay && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Add Activity to ${currentDay.day}`}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-emerald-950">
                  Add Activity to {currentDay.day}
                </h3>
                <p className="text-xs text-gray-500">
                  Insert a new milestone, company tour, or transit stop.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close add activity modal"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700">Scheduled Time</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 11:30 AM"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">Category</label>
                  <select
                    value={newEvent.category}
                    onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="Industry">Industry Visit</option>
                    <option value="Travel">Transit / Travel</option>
                    <option value="Stay">Hotel / Meals</option>
                    <option value="Activity">Sightseeing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Activity Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High Performance Computing Lab Tour"
                  value={newEvent.activity}
                  onChange={(e) => setNewEvent({ ...newEvent, activity: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Location / Venue</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CDAC Gandhinagar Centre"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Faculty / Officer In-Charge</label>
                <input
                  type="text"
                  required
                  value={newEvent.inCharge}
                  onChange={(e) => setNewEvent({ ...newEvent, inCharge: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Details &amp; Protocols</label>
                <textarea
                  rows="2"
                  placeholder="Optional instructions or notes..."
                  value={newEvent.details}
                  onChange={(e) => setNewEvent({ ...newEvent, details: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-800 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-900 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Insert Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
