function validateLatLng(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * Parses lat/lng from pasted Google Maps URLs (@lat,lng or ?q=lat,lng / ?query=lat,lng / ll=lat,lng).
 */
export function parseGoogleMapsUrl(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match @lat,lng (e.g. https://www.google.com/maps/@24.5854,73.7125,15z)
  const atMatch = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(trimmed);
  if (atMatch) {
    return validateLatLng(Number(atMatch[1]), Number(atMatch[2]));
  }

  // Match query parameter q=, query=, or ll=
  const paramMatch = /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?)(?:,|%2C)(-?\d+(?:\.\d+)?)/i.exec(
    trimmed
  );
  if (paramMatch) {
    return validateLatLng(Number(paramMatch[1]), Number(paramMatch[2]));
  }

  return null;
}

export function buildGoogleMapsUrl(lat, lng) {
  const valid = validateLatLng(Number(lat), Number(lng));
  if (!valid) return "";
  return `https://www.google.com/maps/search/?api=1&query=${valid.lat},${valid.lng}`;
}
