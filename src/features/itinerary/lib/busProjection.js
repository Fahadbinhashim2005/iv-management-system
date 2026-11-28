const EARTH_RADIUS_KM = 6371;
const ROAD_DETOUR_FACTOR = 1.25;
const DEFAULT_SPEED_KMH = 35;
const MIN_SPEED_KMH = 15;
const MAX_SPEED_KMH = 70;

function isValidCoord(lat, lng) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function haversineKm(aLat, aLng, bLat, bLng) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Projects a bus location onto the nearest segment of a day's ordered stops.
 * Returns null if fewer than 2 stops have valid coordinates or busPoint is invalid.
 */
export function projectBusOntoDay(stops = [], busPoint) {
  if (!busPoint || !isValidCoord(busPoint.lat, busPoint.lng)) return null;

  const sorted = [...stops].sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0));
  const coordEntries = [];
  sorted.forEach((stop, dayIndex) => {
    if (isValidCoord(stop.lat, stop.lng)) {
      coordEntries.push({ stop, dayIndex });
    }
  });

  if (coordEntries.length < 2) return null;

  let best = null;

  for (let i = 0; i < coordEntries.length - 1; i++) {
    const a = coordEntries[i];
    const b = coordEntries[i + 1];

    const midLatRad = (((a.stop.lat + b.stop.lat) / 2) * Math.PI) / 180;
    const cosLat = Math.max(0.1, Math.cos(midLatRad));

    const ax = a.stop.lng * cosLat;
    const ay = a.stop.lat;
    const bx = b.stop.lng * cosLat;
    const by = b.stop.lat;
    const px = busPoint.lng * cosLat;
    const py = busPoint.lat;

    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projLat = a.stop.lat + t * (b.stop.lat - a.stop.lat);
    const projLng = a.stop.lng + t * (b.stop.lng - a.stop.lng);
    const offRouteKm = haversineKm(busPoint.lat, busPoint.lng, projLat, projLng);

    if (!best || offRouteKm < best.offRouteKm) {
      best = {
        coordSegmentIndex: i,
        fromStopIndex: a.dayIndex,
        toStopIndex: b.dayIndex,
        fraction: t,
        offRouteKm,
        projLat,
        projLng,
        nextStop: b.stop,
      };
    }
  }

  if (!best) return null;

  const straightToNextKm = haversineKm(
    busPoint.lat,
    busPoint.lng,
    best.nextStop.lat,
    best.nextStop.lng
  );
  const roadKm = straightToNextKm * ROAD_DETOUR_FACTOR;

  const rawSpeed = Number(busPoint.speed_kmh);
  const speed =
    Number.isFinite(rawSpeed) && rawSpeed > 5
      ? Math.max(MIN_SPEED_KMH, Math.min(MAX_SPEED_KMH, rawSpeed))
      : DEFAULT_SPEED_KMH;

  const etaMinutes =
    straightToNextKm < 0.05 ? 0 : Math.max(1, Math.round((roadKm / speed) * 60));

  return {
    segmentIndex: best.fromStopIndex,
    fromStopIndex: best.fromStopIndex,
    toStopIndex: best.toStopIndex,
    fraction: Number(best.fraction.toFixed(4)),
    distanceToNextKm: Number(roadKm.toFixed(1)),
    etaMinutes,
    offRouteKm: Number(best.offRouteKm.toFixed(2)),
  };
}
