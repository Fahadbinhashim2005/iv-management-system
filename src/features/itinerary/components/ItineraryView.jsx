import "@fontsource/bebas-neue/400.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, RefreshCw, WifiOff } from "lucide-react";
import { TRIP_TZ } from "../../../config/tripConfig";
import { deriveDayStopsStatus } from "../lib/status";
import { getDayState, getNowInTripTz } from "../lib/time";
import HeroStage from "./HeroStage";
import DaySlider from "./DaySlider";
import Timeline from "./Timeline";

function findDefaultDayIndex(days, timeZone) {
  if (!days || days.length === 0) return 0;

  // Check URL hash (#day-N)
  if (typeof window !== "undefined") {
    const match = /^#day-(\d+)$/i.exec(window.location.hash || "");
    if (match) {
      const targetNum = Number(match[1]);
      const found = days.findIndex((d) => Number(d.day_number) === targetNum);
      if (found >= 0) return found;
    }
  }

  const { isoDate: todayIso } = getNowInTripTz(new Date(), timeZone);
  const todayIdx = days.findIndex((d) => d.date === todayIso);
  if (todayIdx >= 0) return todayIdx;

  if (days[0]?.date && todayIso < days[0].date) return 0;
  if (days[days.length - 1]?.date && todayIso > days[days.length - 1].date) {
    return days.length - 1;
  }
  return 0;
}

export default function ItineraryView({
  itinerary,
  publishedList = [],
  selectedItineraryId = null,
  onSelectItinerary = null,
  loading = false,
  error = null,
  onRetry = null,
  isLive = false,
  isOffline = false,
  cachedAt = null,
  busLocation = null,
  busStatus = "offline",
  busAgeSeconds = null,
  BusOverlayComponent = null,
  showStaffNote = false,
  renderStaffActions = null,
  topSlot = null,
  emptyMessage = "Itinerary not published yet.",
  showBackButton = true,
  previewFrame = false,
}) {
  const navigate = useNavigate();
  const days = useMemo(() => itinerary?.days || [], [itinerary]);

  const [selectedDayIndex, setSelectedDayIndex] = useState(() =>
    findDefaultDayIndex(days, TRIP_TZ)
  );
  const [scrollProgress, setScrollProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  const sheetRef = useRef(null);
  const dotRefs = useRef([]);
  const touchStartXRef = useRef(null);
  const lastItinIdRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Re-pick default day when itinerary changes
  useEffect(() => {
    if (!itinerary?.id || lastItinIdRef.current === itinerary.id) return;
    lastItinIdRef.current = itinerary.id;
    const t = setTimeout(() => {
      setSelectedDayIndex(findDefaultDayIndex(days, TRIP_TZ));
    }, 0);
    return () => clearTimeout(t);
  }, [itinerary?.id, days]);

  // Split-on-scroll controller (0..1 via rAF)
  useEffect(() => {
    if (reducedMotion || previewFrame) return;
    let rafId = null;
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const p = Math.max(0, Math.min(1, window.scrollY / 240));
        setScrollProgress(p);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [reducedMotion, previewFrame]);

  const safeDayIndex = Math.min(selectedDayIndex, Math.max(0, days.length - 1));
  const currentDay = days[safeDayIndex] || null;

  const handleSelectDay = (idx) => {
    setSelectedDayIndex(idx);
    const dayObj = days[idx];
    if (dayObj && typeof window !== "undefined" && !previewFrame) {
      window.history.replaceState(null, "", `#day-${dayObj.day_number}`);
    }
  };

  const derived = useMemo(() => {
    if (!currentDay) {
      return { stops: [], doneCount: 0, totalCount: 0, currentIndex: -1 };
    }
    return deriveDayStopsStatus(currentDay.stops || [], currentDay.date, new Date(), TRIP_TZ);
  }, [currentDay]);

  const isToday = currentDay
    ? getDayState(currentDay.date, new Date(), TRIP_TZ) === "today"
    : false;

  const nextStop =
    derived.stops.find((s) => s.derivedStatus === "now") ||
    derived.stops.find((s) => s.derivedStatus === "upcoming") ||
    null;

  const scrollToSheet = () => {
    sheetRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches?.[0]?.clientX;
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (typeof endX !== "number") return;
    const delta = endX - startX;
    if (Math.abs(delta) < 60) return;
    if (delta < 0 && safeDayIndex < days.length - 1) {
      handleSelectDay(safeDayIndex + 1);
    } else if (delta > 0 && safeDayIndex > 0) {
      handleSelectDay(safeDayIndex - 1);
    }
  };

  if (loading && !itinerary) {
    return (
      <div className="space-y-4">
        <div className="h-[46dvh] rounded-3xl bg-emerald-950/15 motion-safe:animate-pulse" />
        <div className="h-14 rounded-2xl bg-white motion-safe:animate-pulse" />
        <div className="h-44 rounded-3xl bg-white motion-safe:animate-pulse" />
      </div>
    );
  }

  if (error && !itinerary) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center space-y-3">
        <p className="text-sm font-bold text-red-900">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-800 transition"
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center space-y-2 shadow-xs">
        <Calendar size={34} className="mx-auto text-emerald-700 opacity-60" />
        <h2 className="text-base font-extrabold text-emerald-950">{emptyMessage}</h2>
        <p className="text-xs text-gray-600 max-w-md mx-auto">
          Once published, your day-by-day schedule, stop locations, and live updates will appear here.
        </p>
      </div>
    );
  }

  const cachedLabel = cachedAt
    ? new Date(cachedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="-mx-3 -mt-5 sm:-mx-6 sm:-mt-7 lg:-mx-10 lg:-mt-8 overflow-x-clip">
      {/* Offline cached banner */}
      {isOffline && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-xs font-bold text-amber-950"
        >
          <WifiOff size={14} />
          <span>
            Offline — showing cached copy{cachedLabel ? ` (last updated ${cachedLabel})` : ""}
          </span>
        </div>
      )}

      {/* Optional selector when multiple published itineraries exist */}
      {publishedList.length > 1 && onSelectItinerary && (
        <div className="flex items-center justify-between gap-2 bg-[#03231b] px-4 py-2 text-xs text-white">
          <span className="font-semibold text-emerald-200">Trip:</span>
          <select
            aria-label="Select published itinerary"
            value={selectedItineraryId || itinerary.id}
            onChange={(e) => onSelectItinerary(e.target.value)}
            className="rounded-lg border border-white/20 bg-emerald-950 px-2.5 py-1.5 text-xs font-bold text-white"
          >
            {publishedList.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
                {item.is_active ? " (Active)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Optional top slot (e.g. Coordinator Share Bus Location card) */}
      {topSlot && <div className="bg-[#03231b] px-4 pt-3 pb-2">{topSlot}</div>}

      {/* Page 1 & 2: Hero Stage */}
      <HeroStage
        itinerary={itinerary}
        day={currentDay}
        isToday={isToday}
        nextStop={nextStop}
        busLiveStatus={busStatus}
        hasBusRow={Boolean(busLocation)}
        isRealtimeLive={isLive}
        scrollProgress={scrollProgress}
        reducedMotion={reducedMotion}
        onBack={showBackButton ? () => navigate(-1) : null}
        onViewPlan={scrollToSheet}
      />

      {/* Page 2 & 3: White Sliding Sheet with Matching Upward Center Notch */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative z-20 -mt-8 rounded-t-[28px] bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.14)]"
      >
        {/* Upward center notch curve matching Canva page 2 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2"
        >
          <svg viewBox="0 0 120 20" className="h-5 w-28" preserveAspectRatio="none">
            <path
              d="M0,20 C35,20 42,2 60,2 C78,2 85,20 120,20 Z"
              fill="#ffffff"
            />
          </svg>
        </div>

        {/* Sticky Day Slider */}
        <div className="sticky top-0 z-30 rounded-t-[28px] border-b border-gray-100 bg-white/95 pt-2 backdrop-blur-md">
          {itinerary?.title && (
            <p className="px-4 pt-1 text-[10px] font-extrabold uppercase tracking-widest text-[#065F46]">
              {itinerary.title}
            </p>
          )}
          <DaySlider
            days={days}
            selectedIndex={safeDayIndex}
            onSelect={handleSelectDay}
            timeZone={TRIP_TZ}
          />
        </div>

        {/* Timeline */}
        <Timeline
          day={currentDay}
          stops={derived.stops}
          doneCount={derived.doneCount}
          totalCount={derived.totalCount}
          currentIndex={derived.currentIndex}
          showStaffNote={showStaffNote}
          renderStaffActions={renderStaffActions}
          dotRefs={dotRefs}
          BusOverlay={BusOverlayComponent}
          busOverlayProps={
            BusOverlayComponent
              ? {
                  day: currentDay,
                  isToday,
                  stops: derived.stops,
                  currentIndex: derived.currentIndex,
                  busLocation,
                  busStatus,
                  ageSeconds: busAgeSeconds,
                  reducedMotion,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
