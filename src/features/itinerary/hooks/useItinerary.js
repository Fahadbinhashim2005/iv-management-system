import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";
import { itineraryApi } from "../api/itineraryApi";

const CACHE_PREFIX = "iv_itinerary_cache_v1_";
const FALLBACK_POLL_MS = 15000;

function readCached(cacheKey) {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCached(cacheKey, payload) {
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${cacheKey}`,
      JSON.stringify({
        data: payload,
        cachedAt: new Date().toISOString(),
        updatedAt: payload?.updated_at || null,
      })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function useItinerary(id = null, { staffView = false, enabled = true } = {}) {
  const cacheKey = `${staffView ? "staff" : "student"}_${id || "active"}`;
  const initialCache = readCached(cacheKey);

  const [data, setData] = useState(initialCache?.data || null);
  const [cachedAt, setCachedAt] = useState(initialCache?.cachedAt || null);
  const [loading, setLoading] = useState(!initialCache?.data && enabled);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  const mountedRef = useRef(true);
  const debounceRef = useRef(null);
  const pollTimerRef = useRef(null);

  const fetchItinerary = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = id
        ? await itineraryApi.get(id, { staffView })
        : await itineraryApi.getActive({ staffView });
      if (!mountedRef.current) return;
      setData(result);
      setError(null);
      setIsOffline(false);
      setLoading(false);
      if (result) {
        const nowIso = new Date().toISOString();
        setCachedAt(nowIso);
        writeCached(cacheKey, result);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err?.message || "Could not load itinerary.");
      setLoading(false);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setIsOffline(true);
      }
    }
  }, [id, staffView, enabled, cacheKey]);

  useEffect(() => {
    mountedRef.current = true;
    const cached = readCached(cacheKey);
    const t = setTimeout(() => {
      if (cached?.data) {
        setData(cached.data);
        setCachedAt(cached.cachedAt || null);
      }
      fetchItinerary();
    }, 0);

    const onOnline = () => {
      setIsOffline(false);
      fetchItinerary();
    };
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      mountedRef.current = false;
      clearTimeout(t);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [cacheKey, fetchItinerary]);

  // Realtime subscription on itinerary rows (debounced 300ms full refetch) + 15s polling fallback
  const itineraryId = data?.id || id;

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || !supabase || !itineraryId) {
      return;
    }

    const scheduleRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (document.visibilityState !== "hidden") {
          fetchItinerary();
        }
      }, 300);
    };

    const startPollingFallback = () => {
      if (pollTimerRef.current) return;
      pollTimerRef.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchItinerary();
        }
      }, FALLBACK_POLL_MS);
    };

    const stopPollingFallback = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const channel = supabase
      .channel(`itinerary-live-${itineraryId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "itineraries", filter: `id=eq.${itineraryId}` },
        scheduleRefetch
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "itinerary_days",
          filter: `itinerary_id=eq.${itineraryId}`,
        },
        scheduleRefetch
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "itinerary_stops",
          filter: `itinerary_id=eq.${itineraryId}`,
        },
        scheduleRefetch
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        if (status === "SUBSCRIBED") {
          setIsLive(true);
          stopPollingFallback();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setIsLive(false);
          startPollingFallback();
        }
      });

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchItinerary();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      stopPollingFallback();
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, [enabled, itineraryId, fetchItinerary]);

  return {
    data,
    loading,
    error,
    refresh: fetchItinerary,
    isLive,
    isOffline,
    cachedAt,
  };
}
