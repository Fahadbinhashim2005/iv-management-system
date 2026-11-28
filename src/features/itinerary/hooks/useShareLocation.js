import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";
import { haversineKm } from "../lib/busProjection";

const MIN_SEND_INTERVAL_MS = 8000;
const HEARTBEAT_INTERVAL_MS = 30000;
const MIN_MOVE_METERS = 30;

export function useShareLocation({ busId, itineraryId }) {
  const [sharing, setSharing] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(null);
  const [accuracyM, setAccuracyM] = useState(null);
  const [error, setError] = useState(null);

  const watchIdRef = useRef(null);
  const wakeLockRef = useRef(null);
  const lastSentRef = useRef({ ts: 0, lat: null, lng: null });
  const activeBusRef = useRef({ busId, itineraryId });

  useEffect(() => {
    activeBusRef.current = { busId, itineraryId };
  }, [busId, itineraryId]);

  const acquireWakeLock = useCallback(async () => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // Wake lock optional; ignore if denied/unsupported
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Ignore release errors
      }
      wakeLockRef.current = null;
    }
  }, []);

  const stopSharing = useCallback(async () => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    await releaseWakeLock();
    setSharing(false);

    const { busId: bId } = activeBusRef.current;
    if (bId && isSupabaseConfigured && supabase) {
      await supabase.from("bus_locations").delete().eq("bus_id", bId).catch(() => {});
    }
  }, [releaseWakeLock]);

  const maybeSendPosition = useCallback(async (pos) => {
    const { busId: bId, itineraryId: itinId } = activeBusRef.current;
    if (!bId || !itinId || !isSupabaseConfigured || !supabase) return;

    const now = Date.now();
    const elapsed = now - lastSentRef.current.ts;
    if (elapsed < MIN_SEND_INTERVAL_MS) return;

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const movedMeters =
      lastSentRef.current.lat !== null && lastSentRef.current.lng !== null
        ? haversineKm(lastSentRef.current.lat, lastSentRef.current.lng, lat, lng) * 1000
        : Infinity;

    if (movedMeters < MIN_MOVE_METERS && elapsed < HEARTBEAT_INTERVAL_MS) {
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) {
      setError("You must be signed in with a Supabase session to share location.");
      return;
    }

    const speedKmh =
      pos.coords.speed != null && Number.isFinite(pos.coords.speed)
        ? Math.max(0, Number((pos.coords.speed * 3.6).toFixed(1)))
        : null;

    const { error: upsertErr } = await supabase.from("bus_locations").upsert(
      {
        bus_id: bId,
        itinerary_id: itinId,
        lat,
        lng,
        speed_kmh: speedKmh,
        heading: pos.coords.heading ?? null,
        accuracy_m: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
        recorded_at: new Date().toISOString(),
        updated_by: userId,
      },
      { onConflict: "bus_id" }
    );

    if (upsertErr) {
      setError(upsertErr.message || "Failed to send location.");
      return;
    }

    lastSentRef.current = { ts: now, lat, lng };
    setLastSentAt(now);
    setAccuracyM(pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null);
    setError(null);
  }, []);

  const startSharing = useCallback(async () => {
    setError(null);
    if (!busId || !itineraryId) {
      setError("Select a bus and active itinerary first.");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("Location sharing requires HTTPS.");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("GPS geolocation is not supported on this device.");
      return;
    }

    lastSentRef.current = { ts: 0, lat: null, lng: null };
    setSharing(true);
    await acquireWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        maybeSendPosition(pos);
      },
      (geoErr) => {
        if (geoErr.code === 1) {
          setError("Location permission denied. Enable location access to share bus position.");
          stopSharing();
        } else {
          setError(geoErr.message || "Unable to read GPS signal.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [busId, itineraryId, acquireWakeLock, maybeSendPosition, stopSharing]);

  useEffect(() => {
    if (!sharing) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [sharing, acquireWakeLock]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return {
    sharing,
    lastSentAt,
    accuracyM,
    error,
    startSharing,
    stopSharing,
  };
}
