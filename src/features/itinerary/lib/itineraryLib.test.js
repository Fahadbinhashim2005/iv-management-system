import test from "node:test";
import assert from "node:assert/strict";

import {
  getNowInTripTz,
  parseTimeHHMM,
  format12h,
  getDayState,
  formatDuration,
} from "./time.js";
import { deriveDayStopsStatus } from "./status.js";
import { projectBusOntoDay } from "./busProjection.js";
import { shiftStopsAfter } from "./shift.js";
import { parseGoogleMapsUrl, buildGoogleMapsUrl } from "./mapsLink.js";
import {
  validateImageFile,
  computeTargetDimensions,
  MAX_ORIGINAL_IMAGE_BYTES,
} from "./imageUpload.js";

test("time.js converts UTC timestamp into Asia/Kolkata regardless of host TZ", () => {
  // 2026-12-07T04:00:00Z == 09:30 AM IST (+05:30)
  const utc = new Date("2026-12-07T04:00:00.000Z");
  const tz = getNowInTripTz(utc, "Asia/Kolkata");
  assert.equal(tz.isoDate, "2026-12-07");
  assert.equal(tz.hhmm, "09:30");
  assert.equal(tz.timeMinutes, 9 * 60 + 30);

  // 2026-12-07T20:00:00Z == 2026-12-08 01:30 AM IST
  const nextDayUtc = new Date("2026-12-07T20:00:00.000Z");
  const tz2 = getNowInTripTz(nextDayUtc, "Asia/Kolkata");
  assert.equal(tz2.isoDate, "2026-12-08");
  assert.equal(tz2.hhmm, "01:30");

  assert.equal(parseTimeHHMM("14:05:00"), 14 * 60 + 5);
  assert.equal(format12h("14:05"), "02:05 PM");
  assert.equal(format12h("00:15"), "12:15 AM");
  assert.equal(getDayState("2026-12-06", utc), "past");
  assert.equal(getDayState("2026-12-07", utc), "today");
  assert.equal(getDayState("2026-12-08", utc), "future");
  assert.equal(formatDuration("23:00", "01:30"), "2h 30m");
});

test("status.js handles single-stop day, midnight edge, overrides, and TBC stops", () => {
  // Single stop on today (10:00 IST = 04:30Z)
  const now10amIst = new Date("2026-12-07T04:30:00.000Z");
  const singleBefore = deriveDayStopsStatus(
    [{ id: "s1", sequence_no: 1, start_time: "11:00", time_tbc: false }],
    "2026-12-07",
    now10amIst
  );
  assert.equal(singleBefore.stops[0].derivedStatus, "upcoming");
  assert.equal(singleBefore.currentIndex, 0);

  const singleDuring = deriveDayStopsStatus(
    [{ id: "s1", sequence_no: 1, start_time: "09:00", time_tbc: false }],
    "2026-12-07",
    now10amIst
  );
  assert.equal(singleDuring.stops[0].derivedStatus, "now");

  // Midnight wrap: 23:00 -> 01:00, checked at 23:30 IST (18:00Z)
  const now2330Ist = new Date("2026-12-07T18:00:00.000Z");
  const midnightWrap = deriveDayStopsStatus(
    [{ id: "s-late", sequence_no: 1, start_time: "23:00", end_time: "01:00", time_tbc: false }],
    "2026-12-07",
    now2330Ist
  );
  assert.equal(midnightWrap.stops[0].derivedStatus, "now");

  // Override precedence + TBC order resolution
  const mixed = deriveDayStopsStatus(
    [
      { id: "a", sequence_no: 1, start_time: null, time_tbc: true },
      { id: "b", sequence_no: 2, start_time: "09:00", end_time: "11:00", status_override: "skipped" },
      { id: "c", sequence_no: 3, start_time: "11:00", status_override: "now" },
      { id: "d", sequence_no: 4, start_time: null, time_tbc: true },
    ],
    "2026-12-07",
    now10amIst
  );
  assert.equal(mixed.stops[0].derivedStatus, "done"); // TBC before active/override-now becomes done
  assert.equal(mixed.stops[1].derivedStatus, "skipped"); // override wins
  assert.equal(mixed.stops[2].derivedStatus, "now"); // override wins
  assert.equal(mixed.stops[3].derivedStatus, "upcoming"); // TBC after active stays upcoming
  assert.equal(mixed.doneCount, 1);
  assert.equal(mixed.currentIndex, 2);
});

test("busProjection.js projects start/middle/end, off-route, and returns null if <2 coords", () => {
  const noCoords = projectBusOntoDay([{ id: "1", sequence_no: 1, lat: 24.5, lng: 73.7 }], {
    lat: 24.5,
    lng: 73.7,
  });
  assert.equal(noCoords, null);

  const stops = [
    { id: "s1", sequence_no: 1, lat: 24.0, lng: 73.0 },
    { id: "s2", sequence_no: 2, lat: 24.0, lng: 74.0 },
    { id: "s3", sequence_no: 3, lat: 25.0, lng: 74.0 },
  ];

  // Segment start
  const atStart = projectBusOntoDay(stops, { lat: 24.0, lng: 73.0, speed_kmh: 50 });
  assert.equal(atStart.fromStopIndex, 0);
  assert.equal(atStart.fraction, 0);
  assert.ok(atStart.distanceToNextKm > 100);
  assert.ok(atStart.etaMinutes > 60);

  // Segment middle
  const atMid = projectBusOntoDay(stops, { lat: 24.0, lng: 73.5, speed_kmh: 40 });
  assert.equal(atMid.fromStopIndex, 0);
  assert.ok(Math.abs(atMid.fraction - 0.5) < 0.02);

  // Segment end of second leg
  const atEnd = projectBusOntoDay(stops, { lat: 25.0, lng: 74.0, speed_kmh: 40 });
  assert.equal(atEnd.fromStopIndex, 1);
  assert.equal(atEnd.fraction, 1);
  assert.equal(atEnd.etaMinutes, 0);

  // Off-route point near middle of leg 1
  const offRoute = projectBusOntoDay(stops, { lat: 24.2, lng: 73.5 });
  assert.equal(offRoute.fromStopIndex, 0);
  assert.ok(offRoute.offRouteKm > 15);
});

test("shift.js shifts stops after sequence and clamps 00:00–23:59 leaving TBC untouched", () => {
  const stops = [
    { id: "1", sequence_no: 1, start_time: "08:00", end_time: "09:00", time_tbc: false },
    { id: "2", sequence_no: 2, start_time: "23:45", end_time: "23:55", time_tbc: false },
    { id: "3", sequence_no: 3, start_time: null, end_time: null, time_tbc: true },
  ];

  const shifted = shiftStopsAfter(stops, 1, 30);
  assert.equal(shifted[0].start_time, "08:00");
  assert.equal(shifted[1].start_time, "23:59");
  assert.equal(shifted[1].end_time, "23:59");
  assert.equal(shifted[2].start_time, null);
  assert.equal(shifted[2].time_tbc, true);

  const clampedZero = shiftStopsAfter(
    [{ id: "4", sequence_no: 2, start_time: "00:10", end_time: "00:25", time_tbc: false }],
    1,
    -30
  );
  assert.equal(clampedZero[0].start_time, "00:00");
  assert.equal(clampedZero[0].end_time, "00:00");
});

test("mapsLink.js parses valid URLs and rejects malformed or out-of-range coordinates", () => {
  assert.deepEqual(
    parseGoogleMapsUrl("https://www.google.com/maps/place/City+Palace/@24.5764,73.6835,17z"),
    { lat: 24.5764, lng: 73.6835 }
  );
  assert.deepEqual(
    parseGoogleMapsUrl("https://maps.google.com/?q=26.9239,75.8267"),
    { lat: 26.9239, lng: 75.8267 }
  );
  assert.equal(parseGoogleMapsUrl("https://www.google.com/maps/?q=95.0,75.0"), null);
  assert.equal(parseGoogleMapsUrl("not a maps link"), null);
  assert.equal(
    buildGoogleMapsUrl(24.5764, 73.6835),
    "https://www.google.com/maps/search/?api=1&query=24.5764,73.6835"
  );
  assert.equal(buildGoogleMapsUrl(999, 10), "");
});

test("imageUpload.js validates file type/size and preserves aspect ratio on resize", () => {
  assert.equal(validateImageFile({ type: "image/webp", size: 1024 }), null);
  assert.ok(validateImageFile({ type: "image/gif", size: 1024 }));
  assert.ok(validateImageFile({ type: "image/jpeg", size: MAX_ORIGINAL_IMAGE_BYTES + 1 }));
  assert.deepEqual(computeTargetDimensions(3200, 1600, 1600), { width: 1600, height: 800 });
  assert.deepEqual(computeTargetDimensions(800, 600, 1600), { width: 800, height: 600 });
});
