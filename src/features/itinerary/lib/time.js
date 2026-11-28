export const DEFAULT_TRIP_TZ = "Asia/Kolkata";

/**
 * Returns the current wall-clock date and time in the fixed trip timezone.
 */
export function getNowInTripTz(now = new Date(), timeZone = DEFAULT_TRIP_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value || "00";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;
  const minute = Number(get("minute"));

  return {
    isoDate: `${year}-${month}-${day}`,
    timeMinutes: hour * 60 + minute,
    hhmm: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

/**
 * Parses "HH:MM" or "HH:MM:SS" into minutes since 00:00 (0..1439).
 */
export function parseTimeHHMM(value) {
  if (!value || typeof value !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function formatMinutesHHMM(totalMinutes) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function format12h(timeStr) {
  const mins = parseTimeHHMM(timeStr);
  if (mins === null) return "";
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatShortDate(isoDate) {
  if (!isoDate || typeof isoDate !== "string") return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return isoDate;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function getDayState(dayDateIso, now = new Date(), timeZone = DEFAULT_TRIP_TZ) {
  if (!dayDateIso) return "future";
  const { isoDate: todayIso } = getNowInTripTz(now, timeZone);
  if (dayDateIso < todayIso) return "past";
  if (dayDateIso > todayIso) return "future";
  return "today";
}

export function formatDuration(startTimeStr, endTimeStr) {
  const start = parseTimeHHMM(startTimeStr);
  const end = parseTimeHHMM(endTimeStr);
  if (start === null || end === null) return "";
  let diff = end - start;
  if (diff < 0) diff += 24 * 60;
  if (diff <= 0) return "";
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}
