import { useState } from "react";
import { 
  Clock, 
  MapPin, 
  Plus, 
  Trash2, 
  Bell, 
  Check
} from "lucide-react";

export default function CoordinatorItinerary() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Multi-day itinerary state
  const [schedule, setSchedule] = useState({
    1: [
      { id: 1, time: "06:00 AM", activity: "Assembly & Luggage Verification", venue: "College Gate #2", inCharge: "Prof. Anjali Menon", type: "Departure" },
      { id: 2, time: "07:00 AM", activity: "Convoy Departure via NH 48", venue: "Expressway Transit", inCharge: "Mr. Suresh (Lead Driver)", type: "Travel" },
      { id: 3, time: "02:30 PM", activity: "Hotel Check-in & Key Handover", venue: "Hotel Grand Ambience", inCharge: "Dr. Rajesh Kumar", type: "Stay" },
      { id: 4, time: "05:30 PM", activity: "Sabarmati Riverfront Briefing", venue: "Riverfront Promenade", inCharge: "Faculty Team", type: "Activity" },
    ],
    2: [
      { id: 5, time: "08:30 AM", activity: "Departure to GIFT City", venue: "Gandhinagar Route", inCharge: "Bus Coordinators", type: "Travel" },
      { id: 6, time: "10:00 AM", activity: "FinTech Hub & Server Datacenter Tour", venue: "GIFT Tower 1", inCharge: "GIFT Technical Team", type: "Industry" },
      { id: 7, time: "01:30 PM", activity: "Networking Lunch & Q&A Session", venue: "GIFT Convention Club", inCharge: "Industry Panel", type: "Industry" },
      { id: 8, time: "03:30 PM", activity: "Automated Utility Tunnel Walk", venue: "Command Control Center", inCharge: "GIFT Infrastructure In-Charge", type: "Industry" },
    ],
    3: [
      { id: 9, time: "09:30 AM", activity: "ISRO Space Applications Centre Tour", venue: "SAC Ahmedabad", inCharge: "ISRO Scientists", type: "Industry" },
      { id: 10, time: "02:00 PM", activity: "Robotics & AI Simulation Labs", venue: "Gujarat Science City", inCharge: "Science City Guides", type: "Activity" },
    ],
    4: [
      { id: 11, time: "08:00 AM", activity: "Room Clearance & Checkout", venue: "Hotel Grand Ambience", inCharge: "Hotel Committee", type: "Stay" },
      { id: 12, time: "09:00 AM", activity: "Departure for Return Journey", venue: "Highway Return Route", inCharge: "Driver Team", type: "Travel" },
      { id: 13, time: "07:00 PM", activity: "Arrival at Campus Main Gate", venue: "College Campus", inCharge: "HOD & Coordinators", type: "Departure" },
    ],
  });

  // New Event Form State
  const [newEvent, setNewEvent] = useState({
    time: "",
    activity: "",
    venue: "",
    inCharge: "Dr. Rajesh Kumar",
    type: "Industry",
  });

  const handleAddEvent = (e) => {
    e.preventDefault();
    const created = {
      id: Date.now(),
      ...newEvent,
    };
    setSchedule({
      ...schedule,
      [selectedDay]: [...(schedule[selectedDay] || []), created],
    });
    setShowAddModal(false);
    setNewEvent({ time: "", activity: "", venue: "", inCharge: "Dr. Rajesh Kumar", type: "Industry" });
  };

  const handleDeleteEvent = (id) => {
    setSchedule({
      ...schedule,
      [selectedDay]: schedule[selectedDay].filter((item) => item.id !== id),
    });
  };

  const handleBroadcast = () => {
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 3000);
  };

  const currentEvents = schedule[selectedDay] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Schedule Management</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Itinerary Planner & Broadcast
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Add, update, and realign daily tour legs and push schedule adjustments directly to students.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBroadcast}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 active:scale-95"
          >
            <Bell size={16} />
            <span>{broadcastSent ? "Broadcast Pushed! ✓" : "Broadcast Changes"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900 active:scale-95"
          >
            <Plus size={16} />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {/* Broadcast Alert Confirmation Banner */}
      {broadcastSent && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-800 p-4 text-xs font-bold text-white shadow-md">
          <Check size={18} />
          <span>Real-time push notification and SMS dispatched to all 128 enrolled students.</span>
        </div>
      )}

      {/* Day Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { day: 1, label: "Day 1 (Dec 5)", sub: "Departure & Hotel Arrival" },
          { day: 2, label: "Day 2 (Dec 6)", sub: "GIFT City FinTech Tour" },
          { day: 3, label: "Day 3 (Dec 7)", sub: "ISRO SAC & Science City" },
          { day: 4, label: "Day 4 (Dec 8)", sub: "Return to Campus" },
        ].map((d) => (
          <button
            key={d.day}
            type="button"
            onClick={() => setSelectedDay(d.day)}
            className={`flex flex-col items-start rounded-2xl px-5 py-3 text-left transition shrink-0 ${
              selectedDay === d.day
                ? "bg-emerald-800 text-white shadow-sm"
                : "bg-white text-gray-600 ring-1 ring-gray-100 hover:bg-emerald-50 hover:text-emerald-900"
            }`}
          >
            <span className="text-xs font-black">{d.label}</span>
            <span className={`text-[10px] ${selectedDay === d.day ? "text-emerald-200" : "text-gray-400"}`}>
              {d.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Schedule Items List */}
      <div className="space-y-3">
        {currentEvents.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-xs text-gray-500">
            No events scheduled for Day {selectedDay}. Click "Add Activity" to insert schedule slots.
          </div>
        ) : (
          currentEvents.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xs font-bold text-emerald-800">
                  {index + 1}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                      <Clock size={14} />
                      {item.time}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                      {item.type}
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-emerald-950 sm:text-base">
                    {item.activity}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-emerald-700" />
                      {item.venue}
                    </span>
                    <span>•</span>
                    <span>Lead: <strong>{item.inCharge}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(item.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                  title="Remove activity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Activity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-emerald-950">
              Add Activity to Day {selectedDay}
            </h3>
            <p className="text-xs text-gray-500">
              Insert a new milestone, company tour, or transit stop.
            </p>

            <form onSubmit={handleAddEvent} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-xs font-bold text-gray-700">Activity Type</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
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
                  value={newEvent.venue}
                  onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
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
                  className="rounded-xl bg-emerald-800 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-900"
                >
                  Insert Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
