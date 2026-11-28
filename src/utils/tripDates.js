const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Parses a YYYY-MM-DD date string into a local midnight Date.
 * Returns null when the input is missing or invalid.
 */
export function parseLocalIsoDate(isoDate) {
  if (!isoDate || typeof isoDate !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
    return null;
  }
  return d;
}

/**
 * Computes trip status ('upcoming' | 'ongoing' | 'completed') and display label
 * from start/end ISO dates using the device's local calendar date.
 */
export function getTripScheduleStatus(startIso, endIso, now = new Date()) {
  const start = parseLocalIsoDate(startIso);
  const end = parseLocalIsoDate(endIso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!start || !end) {
    return {
      status: "upcoming",
      daysLeft: null,
      dayNumber: null,
      totalDays: null,
      countdownLabel: "Dates TBA",
      durationCountdownLabel: "Dates TBA",
    };
  }

  const totalDays = Math.max(1, Math.round((end - start) / MS_PER_DAY) + 1);

  if (today < start) {
    const daysLeft = Math.round((start - today) / MS_PER_DAY);
    const countdownLabel =
      daysLeft === 1 ? "Departs tomorrow" : `Departs in ${daysLeft} days`;
    return {
      status: "upcoming",
      daysLeft,
      dayNumber: null,
      totalDays,
      countdownLabel,
      durationCountdownLabel: `${totalDays} Days • ${countdownLabel}`,
    };
  }

  if (today <= end) {
    const dayNumber = Math.round((today - start) / MS_PER_DAY) + 1;
    const countdownLabel = `Day ${dayNumber} of ${totalDays}`;
    return {
      status: "ongoing",
      daysLeft: 0,
      dayNumber,
      totalDays,
      countdownLabel,
      durationCountdownLabel: `${totalDays} Days • ${countdownLabel}`,
    };
  }

  return {
    status: "completed",
    daysLeft: 0,
    dayNumber: null,
    totalDays,
    countdownLabel: "Trip Completed",
    durationCountdownLabel: `${totalDays} Days • Completed`,
  };
}
