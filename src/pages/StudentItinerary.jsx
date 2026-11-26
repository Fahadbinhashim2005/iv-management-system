import { useState } from "react";
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

const ITINERARY_DAYS = [
  {
    day: "Day 1",
    date: "Dec 5, 2026",
    title: "Departure & Arrival in Ahmedabad",
    events: [
      {
        id: "d1-1",
        time: "06:00 AM",
        activity: "Assembly at College Main Campus",
        location: "Gate #2 Parking",
        icon: Bus,
        category: "Travel",
        status: "Upcoming",
        details: "Attendance verification & luggage loading into assigned buses.",
      },
      {
        id: "d1-2",
        time: "07:00 AM",
        activity: "Departure to Ahmedabad via Highway Route",
        location: "NH 48",
        icon: Bus,
        category: "Travel",
        status: "Upcoming",
        details: "Breakfast stop arranged at Highway Palace (approx 09:30 AM).",
      },
      {
        id: "d1-3",
        time: "02:30 PM",
        activity: "Hotel Check-in & Lunch",
        location: "Hotel Grand Ambience, Ahmedabad",
        icon: Building2,
        category: "Stay",
        status: "Upcoming",
        details: "Room keys distribution by faculty coordinators. Rest & refresh.",
      },
      {
        id: "d1-4",
        time: "05:30 PM",
        activity: "Sabarmati Riverfront Walk & Evening Orientation",
        location: "Sabarmati Riverfront Promenade",
        icon: Coffee,
        category: "Activity",
        status: "Upcoming",
        details: "Group briefing regarding next day's industrial visit protocols.",
      },
    ],
  },
  {
    day: "Day 2",
    date: "Dec 6, 2026",
    title: "GIFT City Financial & Tech Hub",
    events: [
      {
        id: "d2-1",
        time: "08:30 AM",
        activity: "Departure to GIFT City",
        location: "Gandhinagar",
        icon: Bus,
        category: "Travel",
        status: "Upcoming",
        details: "Mandatory formal dress code & college ID card required.",
      },
      {
        id: "d2-2",
        time: "10:00 AM",
        activity: "FinTech Innovation Center & Datacenter Tour",
        location: "GIFT Tower 1",
        icon: Building2,
        category: "Industry",
        status: "Upcoming",
        details: "Guided tour through server architectures, automated systems, and disaster recovery setups.",
      },
      {
        id: "d2-3",
        time: "01:30 PM",
        activity: "Networking Lunch with Tech Leaders",
        location: "GIFT Club & Convention Hall",
        icon: Coffee,
        category: "Activity",
        status: "Upcoming",
        details: "Interactive Q&A session on career opportunities in cloud & fintech.",
      },
      {
        id: "d2-4",
        time: "03:30 PM",
        activity: "Smart City Infrastructure Command Center",
        location: "Utility Command Tunnel",
        icon: Info,
        category: "Industry",
        status: "Upcoming",
        details: "Observing automated waste collection, district cooling systems, and green power grids.",
      },
    ],
  },
  {
    day: "Day 3",
    date: "Dec 7, 2026",
    title: "Science & Aerospace Exhibition",
    events: [
      {
        id: "d3-1",
        time: "09:30 AM",
        activity: "ISRO Space Applications Centre Exhibition",
        location: "ISRO SAC Ahmedabad",
        icon: Building2,
        category: "Industry",
        status: "Upcoming",
        details: "Satellite telemetry, Chandrayaan models, and aerospace engineering exhibits.",
      },
      {
        id: "d3-2",
        time: "02:00 PM",
        activity: "Gujarat Science City Robotic Gallery",
        location: "Science City Road",
        icon: Info,
        category: "Activity",
        status: "Upcoming",
        details: "Robotics simulations, AI interactive labs, and 3D engineering demonstrations.",
      },
    ],
  },
  {
    day: "Day 4",
    date: "Dec 8, 2026",
    title: "Return Journey",
    events: [
      {
        id: "d4-1",
        time: "08:00 AM",
        activity: "Hotel Checkout & Farewell",
        location: "Hotel Grand Ambience",
        icon: Building2,
        category: "Stay",
        status: "Upcoming",
        details: "Room inspection, clearance and baggage check.",
      },
      {
        id: "d4-2",
        time: "09:00 AM",
        activity: "Departure back to College",
        location: "Ahmedabad Highway",
        icon: Bus,
        category: "Travel",
        status: "Upcoming",
        details: "Expected arrival at college campus by 07:00 PM.",
      },
    ],
  },
];

const CATEGORIES = ["All", "Industry", "Travel", "Stay", "Activity"];

export default function StudentItinerary() {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [completedIds, setCompletedIds] = useState(() => {
    try {
      const saved = localStorage.getItem("iv_student_itinerary_done");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const currentDay = ITINERARY_DAYS[selectedDayIndex];
  const filteredEvents = currentDay.events.filter((ev) => {
    const matchesCategory =
      selectedCategory === "All" || ev.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      ev.activity.toLowerCase().includes(q) ||
      ev.location.toLowerCase().includes(q) ||
      ev.details.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const completedInDay = currentDay.events.filter((ev) =>
    completedIds.includes(ev.id)
  ).length;

  const toggleCompleted = (eventId) => {
    setCompletedIds((prev) => {
      const next = prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId];
      try {
        localStorage.setItem("iv_student_itinerary_done", JSON.stringify(next));
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
        <p className="mt-1 text-sm text-gray-500">
          Complete day-by-day plan, timings, and venue details for our Ahmedabad tour.
        </p>
      </div>

      {/* Day Selector Tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {ITINERARY_DAYS.map((dayPlan, index) => {
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
            placeholder="Search stops or venues..."
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
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
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-500">
          No activities match your current search or category filter on {currentDay.day}.
        </div>
      ) : (
        <div className="relative space-y-4 before:absolute before:bottom-3 before:left-10 before:top-3 before:w-0.5 before:bg-emerald-100">
          {filteredEvents.map((event) => {
            const EventIcon = event.icon;
            const isDone = completedIds.includes(event.id);
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
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-700">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={14} />
                        <span>{event.time}</span>
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {event.category}
                      </span>
                    </div>

                    <button
                      type="button"
                      aria-pressed={isDone}
                      onClick={() => toggleCompleted(event.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                        isDone
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-800"
                      }`}
                    >
                      {isDone ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                      <span>{isDone ? "Completed" : "Mark Done"}</span>
                    </button>
                  </div>

                  <h3 className="mt-1.5 text-base font-bold text-emerald-950 sm:text-lg">
                    {event.activity}
                  </h3>

                  <div className="mt-1 flex items-start gap-1.5 text-xs text-gray-500">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span className="break-words">{event.location}</span>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-gray-600 sm:text-sm">
                    {event.details}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
