import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  Coffee,
  Bus,
  Info,
  Search,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { tripConfig } from "../config/tripConfig";
import { loadSharedItinerary } from "../utils/itineraryStore";

function getCategoryIcon(category) {
  if (category === "Travel") return Bus;
  if (category === "Stay" || category === "Industry") return Building2;
  if (category === "Activity") return Coffee;
  return Info;
}

function toLocalIsoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseTimeToMinutes(timeStr = "") {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(timeStr).trim());
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function getEventStatus(dayIsoDate, timeStr, isManuallyDone, now = new Date()) {
  if (isManuallyDone) return "Done";
  if (!dayIsoDate) return "Upcoming";

  const todayIso = toLocalIsoDate(now);
  if (dayIsoDate < todayIso) return "Done";
  if (dayIsoDate > todayIso) return "Upcoming";

  const lower = String(timeStr || "").trim().toLowerCase();
  if (lower === "all day") return "Now";
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (lower === "early morning") return nowMinutes < 9 * 60 ? "Now" : "Done";

  const eventMinutes = parseTimeToMinutes(timeStr);
  if (eventMinutes === null) return "Upcoming";
  if (nowMinutes < eventMinutes) return "Upcoming";
  if (nowMinutes <= eventMinutes + 90) return "Now";
  return "Done";
}

const CATEGORIES = ["All", "Industry", "Travel", "Stay", "Activity"];

export default function StudentItinerary() {
  const { user } = useAuth();
  const doneStorageKey = user?.id
    ? `iv_student_itinerary_done_${user.id}`
    : "iv_student_itinerary_done";

  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [completedIds, setCompletedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(doneStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const saved = localStorage.getItem(doneStorageKey);
        setCompletedIds(saved ? JSON.parse(saved) : []);
      } catch {
        setCompletedIds([]);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [doneStorageKey]);

  useEffect(() => {
    let active = true;
    loadSharedItinerary()
      .then((res) => {
        if (!active) return;
        const loadedDays = res.days || [];
        setDays(loadedDays);
        const todayIso = toLocalIsoDate();
        const todayIdx = loadedDays.findIndex((d) => d.isoDate === todayIso);
        if (todayIdx >= 0) {
          setSelectedDayIndex(todayIdx);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
          (ev.details || "").toLowerCase().includes(q);
        return matchesCategory && matchesSearch;
      })
    : [];

  const completedInDay = currentDay
    ? currentDay.events.filter(
        (ev) =>
          getEventStatus(currentDay.isoDate, ev.time, completedIds.includes(ev.id)) ===
          "Done"
      ).length
    : 0;

  const toggleCompleted = (eventId) => {
    setCompletedIds((prev) => {
      const next = prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId];
      try {
        localStorage.setItem(doneStorageKey, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-700">Trip Schedule</p>
        <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
          Industrial Visit Itinerary
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Complete day-by-day plan, timings, and venue details for {tripConfig.trip.displayName}.
        </p>
      </div>

      {/* Day Selector Tabs */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-12 rounded-2xl bg-white motion-safe:animate-pulse ring-1 ring-gray-100" />
          <div className="h-36 rounded-2xl bg-white motion-safe:animate-pulse ring-1 ring-gray-100" />
        </div>
      ) : days.length === 0 || !currentDay ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center space-y-2">
          <Calendar size={30} className="mx-auto text-emerald-600 opacity-60" />
          <h2 className="text-sm font-bold text-emerald-950">No itinerary published yet</h2>
          <p className="text-xs text-gray-600">
            Your coordinators will share the day-by-day schedule here once finalized.
          </p>
        </div>
      ) : (
        <>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {days.map((dayPlan, index) => {
              const isSelected = selectedDayIndex === index;
              return (
                <button
                  key={dayPlan.day}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedDayIndex(index)}
                  className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    isSelected
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white text-gray-700 ring-1 ring-gray-100 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  <Calendar size={16} />
                  <span>{dayPlan.day}</span>
                  <span className={`text-xs font-normal ${isSelected ? "text-emerald-100" : "text-gray-500"}`}>
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
                placeholder="Search stops or venues..."
                aria-label="Search itinerary activities or venues"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs text-gray-900 shadow-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={selectedCategory === cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[44px] shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition ${
                    selectedCategory === cat
                      ? "bg-emerald-950 text-white shadow-xs"
                      : "bg-white text-gray-700 ring-1 ring-gray-100 hover:bg-emerald-50"
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
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  {currentDay.day} Highlights
                </span>
                <h2 className="text-xl font-bold text-emerald-950">{currentDay.title}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  {currentDay.events.length} Planned Activities
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  {completedInDay}/{currentDay.events.length} Done
                </span>
              </div>
            </div>
          </div>

          {/* Timeline Events */}
          {filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-600">
              {currentDay.events.length === 0
                ? `No activities scheduled yet for ${currentDay.day}.`
                : `No activities match your current search or category filter on ${currentDay.day}.`}
            </div>
          ) : (
            <div className="relative space-y-4 before:absolute before:bottom-3 before:left-10 before:top-3 before:w-0.5 before:bg-emerald-100">
              {filteredEvents.map((event) => {
                const EventIcon = event.icon || getCategoryIcon(event.category);
                const isManuallyDone = completedIds.includes(event.id);
                const eventStatus = getEventStatus(
                  currentDay.isoDate,
                  event.time,
                  isManuallyDone
                );
                const isDone = eventStatus === "Done";

                return (
                  <div
                    key={event.id}
                    className={`relative flex items-start gap-4 rounded-2xl p-5 shadow-sm ring-1 transition hover:shadow-md ${
                      isDone ? "bg-emerald-50/40 ring-emerald-200" : "bg-white ring-gray-100"
                    }`}
                  >
                    <div
                      className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                        isDone ? "bg-emerald-700" : "bg-emerald-600"
                      }`}
                    >
                      <EventIcon size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-800">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={14} />
                            <span>{event.time}</span>
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            {event.category}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              eventStatus === "Now"
                                ? "bg-amber-100 text-amber-900"
                                : eventStatus === "Done"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {eventStatus}
                          </span>
                        </div>

                        <button
                          type="button"
                          aria-pressed={isManuallyDone}
                          onClick={() => toggleCompleted(event.id)}
                          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition ${
                            isManuallyDone
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800"
                          }`}
                        >
                          {isManuallyDone ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                          <span>{isManuallyDone ? "Completed" : "Mark Done"}</span>
                        </button>
                      </div>

                      <h3 className="mt-1.5 text-base font-bold text-emerald-950 sm:text-lg">
                        {event.activity}
                      </h3>

                      <div className="mt-1 flex items-start gap-1.5 text-xs text-gray-600">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                        <span className="break-words">{event.location}</span>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-gray-700 sm:text-sm">
                        {event.details}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
