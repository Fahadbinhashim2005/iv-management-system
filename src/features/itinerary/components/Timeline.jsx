import { Check, Clock, X as XIcon } from "lucide-react";
import { format12h } from "../lib/time";
import StopCard from "./StopCard";

export default function Timeline({
  day,
  stops = [],
  doneCount = 0,
  totalCount = 0,
  currentIndex = -1,
  showStaffNote = false,
  renderStaffActions = null,
  dotRefs = null,
  BusOverlay = null,
  busOverlayProps = null,
}) {
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-2 sm:px-6">
      {/* Day Header & Progress Bar */}
      <div className="mb-6 space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-3xl sm:text-4xl tracking-wide text-[#065F46] uppercase">
            DAY {day?.day_number}{" "}
            <span className="text-[#111827]">{day?.title}</span>
          </h2>
          <span className="text-xs font-extrabold uppercase tracking-wider text-gray-600">
            {doneCount} of {totalCount} stops done
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[#065F46] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Empty Day State */}
      {stops.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50/70 p-8 text-center text-xs font-semibold text-gray-600">
          No stops added for this day yet.
        </div>
      ) : (
        <div className="relative">
          {BusOverlay && <BusOverlay {...busOverlayProps} dotRefs={dotRefs} />}
          <ol className="space-y-4">
            {stops.map((stop, idx) => {
              const status = stop.derivedStatus;
              const isDone = status === "done";
              const isNow = status === "now";
              const isDelayed = status === "delayed";
              const isSkipped = status === "skipped";
              const isLast = idx === stops.length - 1;
              const isFilledSegment = currentIndex >= 0 && idx < currentIndex;

              const timeLabel =
                stop.time_tbc || !stop.start_time
                  ? "TBC"
                  : format12h(stop.start_time);

              return (
                <li
                  key={stop.id}
                  aria-current={isNow ? "step" : undefined}
                  className="relative grid grid-cols-[64px_28px_minmax(0,1fr)] sm:grid-cols-[78px_32px_minmax(0,1fr)] items-start gap-2 sm:gap-3"
                >
                  {/* Left Time Column */}
                  <div className="pt-3 text-right">
                    {timeLabel === "TBC" ? (
                      <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-700">
                        TBC
                      </span>
                    ) : (
                      <span
                        className={`text-xs font-extrabold tabular-nums ${
                          isNow ? "text-[#F59E0B]" : "text-gray-700"
                        }`}
                      >
                        {timeLabel}
                      </span>
                    )}
                  </div>

                  {/* Center Vertical Rail & Dot */}
                  <div className="relative flex flex-col items-center self-stretch pt-3.5">
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className={`absolute top-8 bottom-[-20px] w-0.5 ${
                          isFilledSegment
                            ? "bg-[#065F46]"
                            : "border-l-2 border-dashed border-gray-200 bg-transparent"
                        }`}
                      />
                    )}

                    <span
                      ref={(el) => {
                        if (dotRefs?.current) {
                          dotRefs.current[idx] = el;
                        }
                      }}
                      className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-extrabold transition ${
                        isDone
                          ? "border-[#065F46] bg-[#065F46] text-white"
                          : isNow
                          ? "border-[#F59E0B] bg-[#F59E0B] text-white ring-4 ring-amber-200/80 motion-safe:animate-pulse"
                          : isDelayed
                          ? "border-[#F59E0B] bg-amber-50 text-amber-800"
                          : isSkipped
                          ? "border-gray-300 bg-gray-100 text-gray-500"
                          : "border-gray-300 bg-white text-gray-500"
                      }`}
                    >
                      {isDone && <Check size={14} strokeWidth={3} />}
                      {isDelayed && <Clock size={13} />}
                      {isSkipped && <XIcon size={13} />}
                      {!isDone && !isNow && !isDelayed && !isSkipped && (
                        <span>{idx + 1}</span>
                      )}
                    </span>
                  </div>

                  {/* Right Stop Card */}
                  <div className="min-w-0 pb-1">
                    <StopCard
                      stop={stop}
                      showStaffNote={showStaffNote}
                      renderStaffActions={renderStaffActions}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
