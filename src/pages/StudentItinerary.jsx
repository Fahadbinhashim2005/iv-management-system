import { useState } from "react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Building2, 
  Coffee, 
  Bus, 
  Info
} from "lucide-react";

const ITINERARY_DAYS = [
  {
    day: "Day 1",
    date: "Dec 5, 2026",
    title: "Departure & Arrival in Ahmedabad",
    events: [
      {
        time: "06:00 AM",
        activity: "Assembly at College Main Campus",
        location: "Gate #2 Parking",
        icon: Bus,
        status: "Upcoming",
        details: "Attendance verification & luggage loading into assigned buses.",
      },
      {
        time: "07:00 AM",
        activity: "Departure to Ahmedabad via Highway Route",
        location: "NH 48",
        icon: Bus,
        status: "Upcoming",
        details: "Breakfast stop arranged at Highway Palace (approx 09:30 AM).",
      },
      {
        time: "02:30 PM",
        activity: "Hotel Check-in & Lunch",
        location: "Hotel Grand Ambience, Ahmedabad",
        icon: Building2,
        status: "Upcoming",
        details: "Room keys distribution by faculty coordinators. Rest & refresh.",
      },
      {
        time: "05:30 PM",
        activity: "Sabarmati Riverfront Walk & Evening Orientation",
        location: "Sabarmati Riverfront Promenade",
        icon: Coffee,
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
        time: "08:30 AM",
        activity: "Departure to GIFT City",
        location: "Gandhinagar",
        icon: Bus,
        status: "Upcoming",
        details: "Mandatory formal dress code & college ID card required.",
      },
      {
        time: "10:00 AM",
        activity: "FinTech Innovation Center & Datacenter Tour",
        location: "GIFT Tower 1",
        icon: Building2,
        status: "Upcoming",
        details: "Guided tour through server architectures, automated systems, and disaster recovery setups.",
      },
      {
        time: "01:30 PM",
        activity: "Networking Lunch with Tech Leaders",
        location: "GIFT Club & Convention Hall",
        icon: Coffee,
        status: "Upcoming",
        details: "Interactive Q&A session on career opportunities in cloud & fintech.",
      },
      {
        time: "03:30 PM",
        activity: "Smart City Infrastructure Command Center",
        location: "Utility Command Tunnel",
        icon: Info,
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
        time: "09:30 AM",
        activity: "ISRO Space Applications Centre Exhibition",
        location: "ISRO SAC Ahmedabad",
        icon: Building2,
        status: "Upcoming",
        details: "Satellite telemetry, Chandrayaan models, and aerospace engineering exhibits.",
      },
      {
        time: "02:00 PM",
        activity: "Gujarat Science City Robotic Gallery",
        location: "Science City Road",
        icon: Info,
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
        time: "08:00 AM",
        activity: "Hotel Checkout & Farewell",
        location: "Hotel Grand Ambience",
        icon: Building2,
        status: "Upcoming",
        details: "Room inspection, clearance and baggage check.",
      },
      {
        time: "09:00 AM",
        activity: "Departure back to College",
        location: "Ahmedabad Highway",
        icon: Bus,
        status: "Upcoming",
        details: "Expected arrival at college campus by 07:00 PM.",
      },
    ],
  },
];

export default function StudentItinerary() {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const currentDay = ITINERARY_DAYS[selectedDayIndex];

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
      <div className="flex gap-2 overflow-x-auto pb-2">
        {ITINERARY_DAYS.map((dayPlan, index) => {
          const isSelected = selectedDayIndex === index;
          return (
            <button
              key={dayPlan.day}
              type="button"
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
      <div className="relative space-y-4 before:absolute before:bottom-3 before:left-7 before:top-3 before:w-0.5 before:bg-emerald-100">
        {currentDay.events.map((event, idx) => {
          const EventIcon = event.icon;
          return (
            <div
              key={idx}
              className="relative flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md"
            >
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <EventIcon size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <Clock size={14} />
                    <span>{event.time}</span>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                    {event.status}
                  </span>
                </div>

                <h3 className="mt-1 text-base font-bold text-emerald-950 sm:text-lg">
                  {event.activity}
                </h3>

                <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin size={14} className="shrink-0 text-emerald-600" />
                  <span className="truncate">{event.location}</span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-gray-600 sm:text-sm">
                  {event.details}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
