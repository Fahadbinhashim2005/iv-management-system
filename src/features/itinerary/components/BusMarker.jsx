import { useEffect, useMemo, useState } from "react";
import { Bus } from "lucide-react";
import { projectBusOntoDay } from "../lib/busProjection";
import BusSheet from "./BusSheet";

export default function BusMarker({
  isToday = false,
  stops = [],
  currentIndex = -1,
  busLocation = null,
  busStatus = "offline",
  ageSeconds = null,
  reducedMotion = false,
  dotRefs = null,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [topPx, setTopPx] = useState(null);

  const projection = useMemo(
    () => (busLocation ? projectBusOntoDay(stops, busLocation) : null),
    [stops, busLocation]
  );

  const shouldShow =
    isToday &&
    Boolean(busLocation) &&
    (busStatus === "live" || busStatus === "stale");

  useEffect(() => {
    if (!shouldShow || !dotRefs?.current) {
      const t = setTimeout(() => setTopPx(null), 0);
      return () => clearTimeout(t);
    }

    const measure = () => {
      const dots = dotRefs.current || [];
      if (projection) {
        const fromEl = dots[projection.fromStopIndex];
        const toEl = dots[projection.toStopIndex];
        if (fromEl && toEl) {
          const fromTop = fromEl.offsetTop + fromEl.closest("li")?.offsetTop || 0;
          const toTop = toEl.offsetTop + toEl.closest("li")?.offsetTop || 0;
          const interpolated = fromTop + projection.fraction * (toTop - fromTop);
          setTopPx(interpolated);
          return;
        }
      }

      // Fallback when stops lack coordinates: show only if current stop is travel
      if (currentIndex >= 0 && stops[currentIndex]?.category === "travel") {
        const curEl = dots[currentIndex];
        if (curEl) {
          const y = curEl.offsetTop + (curEl.closest("li")?.offsetTop || 0);
          setTopPx(y);
          return;
        }
      }

      setTopPx(null);
    };

    const t = setTimeout(measure, 0);
    let ro = null;
    if (typeof ResizeObserver !== "undefined" && dotRefs.current[0]?.closest("ol")) {
      ro = new ResizeObserver(measure);
      ro.observe(dotRefs.current[0].closest("ol"));
    }
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [shouldShow, projection, currentIndex, stops, dotRefs]);

  if (!shouldShow || topPx === null) return null;

  const isLive = busStatus === "live";
  const minsAgo = ageSeconds !== null ? Math.max(1, Math.round(ageSeconds / 60)) : 2;
  const label = isLive
    ? `${busLocation.bus_id} · Live${
        projection ? ` · ~${projection.distanceToNextKm} km to next stop` : ""
      } · updated ${ageSeconds ?? 0}s ago`
    : `${busLocation.bus_id} · Last seen ${minsAgo} min ago`;

  return (
    <>
      <div
        className={`pointer-events-auto absolute left-[64px] sm:left-[78px] z-20 flex items-center gap-2.5 ml-2 sm:ml-3 -translate-y-1/2 ${
          reducedMotion ? "" : "transition-[top] duration-1000 ease-linear"
        }`}
        style={{ top: `${Math.round(topPx)}px` }}
      >
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={label}
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md ring-2 ring-white transition ${
            isLive ? "bg-[#065F46]" : "bg-gray-500"
          }`}
        >
          {isLive && !reducedMotion && (
            <span className="absolute inset-0 rounded-xl bg-[#10B981] opacity-40 motion-safe:animate-ping" />
          )}
          <Bus size={18} className="relative z-10" />
          {isLive && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white bg-[#10B981]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="max-w-[230px] sm:max-w-xs truncate rounded-xl border border-gray-200 bg-white/95 px-3 py-1.5 text-[11px] font-bold text-gray-800 shadow-sm backdrop-blur-xs hover:border-emerald-300"
        >
          {label}
        </button>
      </div>

      <BusSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        busLocation={busLocation}
        busStatus={busStatus}
        ageSeconds={ageSeconds}
        projection={projection}
      />
    </>
  );
}
