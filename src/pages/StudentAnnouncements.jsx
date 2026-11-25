import { useState, useEffect } from "react";
import {
  Clock,
  User,
  MapPin,
  ExternalLink,
  BellRing,
  Volume2,
  ListChecks,
  Pin,
  RefreshCw,
} from "lucide-react";
import { useAnnouncementAlerts } from "../features/updates/hooks/useAnnouncementAlerts";
import {
  playSpecialNotificationSound,
  requestBrowserNotificationPermission,
} from "../features/updates/utils/notificationAlert.jsx";

const CATEGORY_LABELS = {
  urgent: "Urgent",
  logistics: "Logistics",
  general: "General",
  info: "Info",
};

export default function StudentAnnouncements() {
  const [filter, setFilter] = useState("all");
  const [notifPerm, setNotifPerm] = useState(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );

  // StudentLayout handles live audio + OS notifications globally; here we just read & mark seen
  const { announcements, loading, error, refresh, markAllSeen } = useAnnouncementAlerts({
    pollIntervalMs: 5000,
    enableAlerts: false,
  });

  useEffect(() => {
    markAllSeen();
  }, [markAllSeen]);

  const handleEnableAlerts = async () => {
    const res = await requestBrowserNotificationPermission();
    setNotifPerm(res);
    await playSpecialNotificationSound("general");
  };

  const handleTestSound = async () => {
    await playSpecialNotificationSound("urgent");
  };

  const filteredAnnouncements =
    filter === "all"
      ? announcements
      : announcements.filter((item) => item.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Official Notices</p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Tour Updates &amp; Announcements
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time instructions, circulars, and Google Maps locations from your coordinators.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Phone & Web Notification + Sound Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
            <BellRing size={18} />
          </div>
          <div>
            <p className="text-xs font-extrabold text-emerald-950">
              Phone &amp; Web Sound Alerts{" "}
              {notifPerm === "granted" ? "(Active ✓)" : "(Tap to Enable)"}
            </p>
            <p className="text-[11px] text-emerald-800">
              Receive instant pop-up alerts with the special chime when coordinators send updates.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTestSound}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
          >
            <Volume2 size={14} /> Test Sound
          </button>

          {notifPerm !== "granted" && notifPerm !== "unsupported" && (
            <button
              type="button"
              onClick={handleEnableAlerts}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
            >
              Enable Phone Alerts
            </button>
          )}
        </div>
      </div>

      {/* Filter Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: "all", label: "All" },
          { value: "urgent", label: "Urgent" },
          { value: "logistics", label: "Logistics" },
          { value: "general", label: "General" },
          { value: "info", label: "Info" },
        ].map((tag) => (
          <button
            key={tag.value}
            type="button"
            onClick={() => setFilter(tag.value)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === tag.value
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-gray-600 ring-1 ring-gray-100 hover:bg-emerald-50 hover:text-emerald-700"
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Announcements Feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-white animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs font-bold text-red-900">
          {error}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-500">
          No notices in this category yet.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
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
                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      <Pin size={11} /> Pinned
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock size={14} />
                  <span>
                    {new Date(item.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <h3 className="mt-3 text-base font-bold text-emerald-950 sm:text-lg">
                {item.title}
              </h3>

              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-gray-600 whitespace-pre-line">
                {item.content}
              </p>

              {item.instructions && (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs text-emerald-950">
                  <p className="font-bold flex items-center gap-1.5 mb-1">
                    <ListChecks size={14} className="text-emerald-700" /> Instructions
                  </p>
                  <p className="whitespace-pre-line">{item.instructions}</p>
                </div>
              )}

              {item.locationUrl && (
                <div className="mt-4">
                  <a
                    href={item.locationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-700 transition"
                  >
                    <MapPin size={16} />
                    <span>{item.locationName || "Open Location in Google Maps"}</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 border-t border-gray-50 pt-3 text-xs text-gray-500">
                <User size={14} className="text-emerald-600" />
                <span>
                  Issued by <span className="font-semibold text-emerald-950">{item.author}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
