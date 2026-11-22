import { useState } from "react";
import { 
  Bell, 
  Trash2, 
  Clock, 
  Send, 
  Check, 
  Pin
} from "lucide-react";

export default function CoordinatorAnnouncements() {
  const [announcements, setAnnouncements] = useState([
    {
      id: 1,
      title: "Mandatory Formal Dress Code for GIFT City Visit",
      category: "Urgent",
      date: "Nov 22, 2026 • 09:30 AM",
      author: "Dr. Rajesh Kumar (HOD CS)",
      content: "All students visiting GIFT City on Dec 6 must wear formal attire (formals with blazers/formal shirts) and carry their valid physical College ID card. Entrance will be denied by GIFT security for casual wear or sneakers.",
      pinned: true,
    },
    {
      id: 2,
      title: "Assembly Timing & Luggage Tagging Protocol",
      category: "Logistics",
      date: "Nov 21, 2026 • 04:15 PM",
      author: "Prof. Anjali Menon",
      content: "Please collect color-coded luggage tags from the department office by Dec 3. On Dec 5, buses start boarding at 06:00 AM sharp at Gate #2. Late arrivals cannot be accommodated as highway permissions are timed.",
      pinned: false,
    },
    {
      id: 3,
      title: "Weather Advisory & Essential Checklist",
      category: "General",
      date: "Nov 20, 2026 • 11:00 AM",
      author: "Student Tour Committee",
      content: "Ahmedabad experiences moderate winter mornings (approx 16°C). Please carry light jackets or shawls for evening riverfront sessions. Don't forget your personal medications and power banks.",
      pinned: false,
    },
  ]);

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newContent, setNewContent] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const handlePost = (e) => {
    e.preventDefault();
    const created = {
      id: Date.now(),
      title: newTitle,
      category: newCategory,
      date: "Just now",
      author: "Dr. Rajesh Kumar (HOD CS)",
      content: newContent,
      pinned: false,
    };
    setAnnouncements([created, ...announcements]);
    setNewTitle("");
    setNewContent("");
    setToastMsg("Announcement broadcasted successfully to all enrolled students!");
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleDelete = (id) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    setToastMsg("Announcement removed.");
    setTimeout(() => setToastMsg(""), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-xs font-bold text-white shadow-xl animate-fade-in">
          <Check size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-800">Broadcast Control</p>
        <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
          Publish Notices & Circulars
        </h1>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Broadcast emergency instructions, schedule adjustments, and logistics circulars to students.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* Post Form Card */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-emerald-800" />
            <h3 className="font-extrabold text-emerald-950 text-sm">Create New Circular</h3>
          </div>

          <form onSubmit={handlePost} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-700">Notice Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
              >
                <option value="Urgent">🚨 Urgent Action Required</option>
                <option value="Logistics">🚌 Travel & Logistics</option>
                <option value="General">ℹ️ General Notice</option>
                <option value="Info">💡 Academic Briefing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700">Notice Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Bus 02 Boarding Gate Shifted to Gate 3"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700">Detailed Message</label>
              <textarea
                rows="4"
                required
                placeholder="Type the full message to be sent via push notification and SMS..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-800 py-3 text-xs font-extrabold text-white shadow-md transition hover:bg-emerald-900 active:scale-95"
            >
              <Send size={15} />
              <span>Broadcast Notice</span>
            </button>
            <p className="text-[10px] text-gray-400 text-center">
              Message will be delivered to 128 confirmed student dashboards.
            </p>
          </form>
        </div>

        {/* Existing Announcements Feed */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-emerald-950 text-sm">
            Active Broadcasts ({announcements.length})
          </h3>

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
                        item.category === "Urgent"
                          ? "bg-red-100 text-red-800"
                          : item.category === "Logistics"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {item.category}
                    </span>
                    {item.pinned && (
                      <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                        <Pin size={11} />
                        Pinned
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock size={12} />
                      {item.date}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                    title="Delete notice"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <h4 className="mt-2 text-sm font-bold text-emerald-950 sm:text-base">
                  {item.title}
                </h4>

                <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                  {item.content}
                </p>

                <p className="mt-3 text-[11px] text-gray-400">
                  Signed by <strong className="text-gray-700">{item.author}</strong>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
