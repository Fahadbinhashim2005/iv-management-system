import { useState } from "react";
import { 
  Clock, 
  User 
} from "lucide-react";

const ANNOUNCEMENTS = [
  {
    id: 1,
    title: "Mandatory Formal Dress Code for GIFT City Visit",
    category: "Urgent",
    date: "Nov 22, 2026 • 09:30 AM",
    author: "Dr. Rajesh Kumar (HOD CS)",
    content: "All students visiting GIFT City on Dec 6 must wear formal attire (formals with blazers/formal shirts) and carry their valid physical College ID card. Entrance will be denied by GIFT security for casual wear or sneakers.",
  },
  {
    id: 2,
    title: "Assembly Timing & Luggage Tagging Protocol",
    category: "Logistics",
    date: "Nov 21, 2026 • 04:15 PM",
    author: "Prof. Anjali Menon",
    content: "Please collect color-coded luggage tags from the department office by Dec 3. On Dec 5, buses start boarding at 06:00 AM sharp at Gate #2. Late arrivals cannot be accommodated as highway permissions are timed.",
  },
  {
    id: 3,
    title: "Weather Advisory & Essential Checklist",
    category: "General",
    date: "Nov 20, 2026 • 11:00 AM",
    author: "Student Tour Committee",
    content: "Ahmedabad experiences moderate winter mornings (approx 16°C). Please carry light jackets or shawls for evening riverfront sessions. Don't forget your personal medications and power banks.",
  },
  {
    id: 4,
    title: "Wi-Fi Access Credentials for Bus & Hotel",
    category: "Info",
    date: "Nov 19, 2026 • 02:45 PM",
    author: "Technical Support Team",
    content: "The unified Wi-Fi network SSID is 'IVConnect_Student' with passkey shared on your registered college email.",
  },
];

export default function StudentAnnouncements() {
  const [filter, setFilter] = useState("All");

  const filteredAnnouncements = filter === "All" 
    ? ANNOUNCEMENTS 
    : ANNOUNCEMENTS.filter((item) => item.category === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-700">Official Notices</p>
        <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
          Tour Updates & Announcements
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Stay informed with real-time circulars, alerts, and guidelines from your faculty coordinators.
        </p>
      </div>

      {/* Filter Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {["All", "Urgent", "Logistics", "General", "Info"].map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setFilter(tag)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === tag
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-gray-600 ring-1 ring-gray-100 hover:bg-emerald-50 hover:text-emerald-700"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Announcements Feed */}
      <div className="space-y-4">
        {filteredAnnouncements.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  item.category === "Urgent"
                    ? "bg-red-100 text-red-800"
                    : item.category === "Logistics"
                    ? "bg-blue-100 text-blue-800"
                    : item.category === "Info"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {item.category}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Clock size={14} />
                <span>{item.date}</span>
              </div>
            </div>

            <h3 className="mt-3 text-base font-bold text-emerald-950 sm:text-lg">
              {item.title}
            </h3>

            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-gray-600">
              {item.content}
            </p>

            <div className="mt-4 flex items-center gap-2 border-t border-gray-50 pt-3 text-xs text-gray-500">
              <User size={14} className="text-emerald-600" />
              <span>Issued by <span className="font-semibold text-emerald-950">{item.author}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
