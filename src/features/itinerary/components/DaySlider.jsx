import { useEffect, useRef } from "react";
import { formatShortDate, getDayState } from "../lib/time";
import { TRIP_TZ } from "../../../config/tripConfig";

export default function DaySlider({
  days = [],
  selectedIndex = 0,
  onSelect,
  timeZone = TRIP_TZ,
}) {
  const activeTabRef = useRef(null);

  useEffect(() => {
    const el = activeTabRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [selectedIndex]);

  const handleKeyDown = (e, idx) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onSelect(Math.min(days.length - 1, idx + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onSelect(Math.max(0, idx - 1));
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Trip days"
      className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-3 scroll-px-4"
    >
      {days.map((day, idx) => {
        const isSelected = idx === selectedIndex;
        const dayState = getDayState(day.date, new Date(), timeZone);
        const isToday = dayState === "today";
        const isPast = dayState === "past";

        return (
          <button
            key={day.id || day.day_number}
            ref={isSelected ? activeTabRef : null}
            type="button"
            role="tab"
            tabIndex={isSelected ? 0 : -1}
            aria-selected={isSelected}
            onClick={() => onSelect(idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`relative flex min-h-[48px] min-w-[82px] shrink-0 snap-center flex-col items-center justify-center rounded-2xl border px-3.5 py-2 text-center transition ${
              isSelected
                ? "border-[#065F46] bg-[#065F46] text-white shadow-sm"
                : isPast
                ? "border-gray-200 bg-gray-50 text-gray-500 hover:border-emerald-300 hover:text-emerald-800"
                : "border-emerald-200/80 bg-white text-emerald-950 hover:bg-emerald-50"
            }`}
          >
            {isToday && (
              <span
                aria-label="Today"
                className={`absolute right-2 top-2 h-2 w-2 rounded-full ${
                  isSelected ? "bg-[#10B981]" : "bg-amber-500"
                }`}
              />
            )}
            <span className="font-display text-base leading-none tracking-wide">
              DAY {day.day_number}
            </span>
            <span
              className={`mt-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isSelected ? "text-emerald-100" : "text-gray-500"
              }`}
            >
              {formatShortDate(day.date)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
