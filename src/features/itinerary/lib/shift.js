import { formatMinutesHHMM, parseTimeHHMM } from "./time.js";

/**
 * Shifts start_time and end_time of all stops strictly after `fromSequence`
 * by `deltaMinutes`, clamped within 00:00–23:59. Stops with time_tbc or no
 * start_time are left untouched.
 */
export function shiftStopsAfter(stops = [], fromSequence, deltaMinutes) {
  const delta = Number(deltaMinutes) || 0;
  return stops.map((stop) => {
    if ((stop.sequence_no ?? 0) <= fromSequence) return stop;
    if (stop.time_tbc || !stop.start_time) return stop;

    const startMins = parseTimeHHMM(stop.start_time);
    if (startMins === null) return stop;

    const newStart = formatMinutesHHMM(startMins + delta);
    let newEnd = stop.end_time ?? null;
    if (stop.end_time) {
      const endMins = parseTimeHHMM(stop.end_time);
      if (endMins !== null) {
        newEnd = formatMinutesHHMM(endMins + delta);
      }
    }

    return {
      ...stop,
      start_time: newStart,
      end_time: newEnd,
    };
  });
}
