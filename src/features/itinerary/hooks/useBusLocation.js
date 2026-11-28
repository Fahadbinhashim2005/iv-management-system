import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";

const LIVE_THRESHOLD_MS = 90 * 1000;
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

export function classifyBusFreshness(recordedAt, nowMs = Date.now()) {
  if (!recordedAt) return { status: "offline", ageSeconds: null };
  const ts = new Date(recordedAt).getTime();
  if (Number.isNaN(ts)) return { status: "offline", ageSeconds: null };
  const diffMs = Math.max(0, nowMs - ts);
  const ageSeconds = Math.round(diffMs / 1000);
  if (diffMs < LIVE_THRESHOLD_MS) return { status: "live", ageSeconds };
  if (diffMs <= STALE_THRESHOLD_MS) return { status: "stale", ageSeconds };
  return { status: "offline", ageSeconds };
}

export function useBusLocation({ itineraryId = null, busId = null, enabled = true } = {}) {
  const [location, setLocation] = useState(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const mountedRef = useRef(true);

  const fetchLatest = useCallback(async () => {
    if (!enabled || !isSupabaseConfigured || !supabase || (!busId && !itineraryId)) return;
    try {
      let q = supabase.from("bus_locations").select("*");
      if (busId) q = q.eq("bus_id", busId);
      else if (itineraryId) q = q.eq("itinerary_id", itineraryId);
      const { data, error } = await q.order("recorded_at", { ascending: false }).limit(1);
      if (!error && mountedRef.current) {
        setLocation(data?.[0] || null);
      }
    } catch {
      // Non-blocking
    }
  }, [enabled, busId, itineraryId]);

  useEffect(() => {
    mountedRef.current = true;
    const t = setTimeout(fetchLatest, 0);

    const ticker = setInterval(() => {
      if (document.visibilityState === "visible") {
        setNowTick(Date.now());
      }
    }, 5000);

    return () => {
      mountedRef.current = false;
      clearTimeout(t);
      clearInterval(ticker);
    };
  }, [fetchLatest]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || !supabase || (!busId && !itineraryId)) return;

    const filter = busId
      ? `bus_id=eq.${busId}`
      : `itinerary_id=eq.${itineraryId}`;

    const channel = supabase
      .channel(`bus-loc-${busId || itineraryId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bus_locations", filter },
        (payload) => {
          if (!mountedRef.current) return;
          if (payload.eventType === "DELETE") {
            setLocation(null);
          } else if (payload.new) {
            setLocation(payload.new);
            setNowTick(Date.now());
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, busId, itineraryId]);

  const { status, ageSeconds } = classifyBusFreshness(location?.recorded_at, nowTick);

  return {
    location,
    status,
    ageSeconds,
    refresh: fetchLatest,
  };
}
