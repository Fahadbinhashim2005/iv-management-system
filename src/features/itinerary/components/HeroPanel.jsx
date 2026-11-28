import { ChevronDown, Calendar, ArrowRight, Compass } from "lucide-react";
import { format12h } from "../lib/time";

export default function HeroPanel({
  itineraryTitle,
  itinerarySubtitle,
  nextStop,
  onViewPlan,
}) {
  const nextTime = nextStop
    ? nextStop.time_tbc
      ? "Time TBC"
      : format12h(nextStop.start_time)
    : "";

  return (
    <div className="relative z-10 w-full bg-gradient-to-t from-[#03231b] via-[#042f24]/92 to-transparent px-5 pb-7 pt-10 text-white sm:px-8">
      <div className="mx-auto max-w-2xl space-y-3">
        <p className="font-display text-2xl sm:text-3xl tracking-wide text-white leading-none">
          TODAY&apos;S JOURNEY
        </p>

        {nextStop && (
          <p className="text-xs sm:text-sm font-semibold text-white/95">
            Next stop:{" "}
            <span className="text-emerald-300 font-bold">{nextStop.title}</span>
            {nextTime ? ` · ${nextTime}` : ""}
          </p>
        )}

        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
            <Compass size={19} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs sm:text-sm font-extrabold text-white">
              {itineraryTitle}
            </p>
            {itinerarySubtitle && (
              <p className="truncate text-[11px] text-white/85">{itinerarySubtitle}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onViewPlan}
            className="inline-flex min-h-[46px] w-full items-center justify-between rounded-full bg-[#10B981] px-5 py-3 text-sm font-extrabold text-white shadow-lg transition hover:bg-emerald-600 active:scale-[0.99]"
          >
            <span className="inline-flex items-center gap-2">
              <Calendar size={17} />
              <span>View today&apos;s plan</span>
            </span>
            <ArrowRight size={17} />
          </button>

          <button
            type="button"
            onClick={onViewPlan}
            aria-label="Scroll down to timeline"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white hover:bg-white/20 transition"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
