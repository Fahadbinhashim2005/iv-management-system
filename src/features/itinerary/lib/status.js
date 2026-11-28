import { DEFAULT_TRIP_TZ, getDayState, getNowInTripTz, parseTimeHHMM } from "./time.js";

/**
 * Derives stop statuses ('done' | 'now' | 'upcoming' | 'skipped' | 'delayed')
 * for a single day's stops ordered by sequence_no.
 */
export function deriveDayStopsStatus(
  stops = [],
  dayDateIso,
  now = new Date(),
  timeZone = DEFAULT_TRIP_TZ
) {
  const sorted = [...stops].sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0));
  if (sorted.length === 0) {
    return { stops: [], doneCount: 0, totalCount: 0, currentIndex: -1 };
  }

  const dayState = getDayState(dayDateIso, now, timeZone);
  const { timeMinutes: nowMinutes } = getNowInTripTz(now, timeZone);

  // Precompute next timed stop's start_time for each stop
  const nextTimedStart = new Array(sorted.length).fill(null);
  let upcomingStart = null;
  for (let i = sorted.length - 1; i >= 0; i--) {
    nextTimedStart[i] = upcomingStart;
    const s = sorted[i];
    if (!s.time_tbc) {
      const parsed = parseTimeHHMM(s.start_time);
      if (parsed !== null) upcomingStart = parsed;
    }
  }

  const initialStatuses = sorted.map((stop, idx) => {
    if (stop.status_override) {
      return stop.status_override;
    }
    if (dayState === "past") return "done";
    if (dayState === "future") return "upcoming";

    // Today
    if (stop.time_tbc) return null; // resolved by order below
    const startMins = parseTimeHHMM(stop.start_time);
    if (startMins === null) return null;

    let endMins = parseTimeHHMM(stop.end_time);
    if (endMins === null) {
      endMins = nextTimedStart[idx];
    }

    // Handle midnight wrap (e.g. 23:00 -> 01:00)
    if (endMins !== null && endMins < startMins) {
      endMins += 24 * 60;
    }

    if (endMins !== null && nowMinutes >= endMins) {
      return "done";
    }
    if (nowMinutes >= startMins) {
      return "now";
    }
    return "upcoming";
  });

  // Resolve TBC / untimed stops on 'today' by order:
  // If any later stop is 'done', 'now', or 'delayed', mark earlier TBC stops 'done', else 'upcoming'
  let seenActiveOrDoneAfter = false;
  for (let i = initialStatuses.length - 1; i >= 0; i--) {
    const st = initialStatuses[i];
    if (st === null) {
      initialStatuses[i] = seenActiveOrDoneAfter ? "done" : "upcoming";
    } else if (st === "done" || st === "now" || st === "delayed") {
      seenActiveOrDoneAfter = true;
    }
  }

  const enriched = sorted.map((stop, idx) => ({
    ...stop,
    derivedStatus: initialStatuses[idx],
  }));

  const doneCount = enriched.filter((s) => s.derivedStatus === "done").length;

  let currentIndex = enriched.findIndex(
    (s) => s.derivedStatus === "now" || s.derivedStatus === "delayed"
  );
  if (currentIndex === -1) {
    currentIndex = enriched.findIndex((s) => s.derivedStatus === "upcoming");
  }
  if (currentIndex === -1 && enriched.length > 0) {
    currentIndex = enriched.length - 1;
  }

  return {
    stops: enriched,
    doneCount,
    totalCount: enriched.length,
    currentIndex,
  };
}
