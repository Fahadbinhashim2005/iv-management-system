import { ChevronDown, Calendar, ArrowRight, Briefcase } from "lucide-react";
import { format12h } from "../lib/time";

export default function HeroPanel({
  itineraryTitle,
  itinerarySubtitle,
  dayTitle,
  nextStop,
  onViewPlan,
}) {
  const nextTime = nextStop
    ? nextStop.time_tbc
      ? "Time TBC"
      : format12h(nextStop.start_time)
    : "";

  // Highlight current day's place inside subtitle if present
  const renderHighlightedSubtitle = () => {
    if (!itinerarySubtitle) return null;
    if (!dayTitle) return itinerarySubtitle;
    const escaped = dayTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "i");
    const segments = itinerarySubtitle.split(regex);
    if (segments.length <= 1) return itinerarySubtitle;
    return segments.map((seg, i) =>
      seg.toLowerCase() === dayTitle.toLowerCase() ? (
        <span key={i} className="font-extrabold text-[#10B981]">
          {seg}
        </span>
      ) : (
        <span key={i}>{seg}</span>
      )
    );
  };

  return (
    <div className="relative z-10 w-full bg-gradient-to-t from-[#022018] via-[#042c22]/95 to-transparent px-5 pb-8 pt-12 text-white sm:px-8">
      <div className="mx-auto max-w-2xl space-y-3">
        <div>
          <p className="font-display text-3xl sm:text-4xl tracking-wide text-white leading-none">
            TODAY&apos;S JOURNEY
          </p>

          {nextStop && (
            <p className="mt-1 text-xs sm:text-sm font-bold text-white/95">
              Next stop:{" "}
              <span className="text-[#10B981] font-extrabold">{nextStop.title}</span>
              {nextTime ? ` • ${nextTime}` : ""}
            </p>
          )}
        </div>

        <div className="border-t border-dashed border-white/20" />

        <div className="flex items-center gap-3.5 rounded-2xl border border-white/15 bg-[#042f24]/75 p-3.5 backdrop-blur-md">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#10B981] text-white shadow-sm">
            <Briefcase size={20} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs sm:text-sm font-extrabold text-white">
              {itineraryTitle}
            </p>
            {itinerarySubtitle && (
              <p className="mt-0.5 text-[11px] sm:text-xs leading-snug text-white/85">
                {renderHighlightedSubtitle()}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onViewPlan}
            className="inline-flex min-h-[48px] w-full items-center justify-between rounded-full bg-[#10B981] px-5 py-3 text-sm font-extrabold text-white shadow-lg transition hover:bg-emerald-500 active:scale-[0.99]"
          >
            <span className="inline-flex items-center gap-2.5">
              <Calendar size={18} />
              <span>View today&apos;s plan</span>
            </span>
            <ArrowRight size={18} />
          </button>

          <button
            type="button"
            onClick={onViewPlan}
            aria-label="Scroll down to timeline"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-[#042f24]/80 text-white hover:bg-white/20 transition"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
