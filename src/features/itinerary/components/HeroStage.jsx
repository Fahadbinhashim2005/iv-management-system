import { ArrowLeft, Compass, Radio } from "lucide-react";
import { getMediaUrls } from "../api/itineraryApi";
import { formatShortDate } from "../lib/time";
import NotchTitle from "./NotchTitle";
import HeroPanel from "./HeroPanel";

function resolveHeroImage(day, itinerary) {
  if (day?.hero_image_path) {
    return {
      path: day.hero_image_path,
      alt: day.hero_alt || day.title || "Day highlight",
      blur: day.hero_blur || null,
      focalX: day.focal_x ?? 50,
      focalY: day.focal_y ?? 50,
    };
  }
  const highlightStop = (day?.stops || []).find(
    (s) => s.is_highlight && s.image_path
  );
  if (highlightStop) {
    return {
      path: highlightStop.image_path,
      alt: highlightStop.image_alt || highlightStop.title || day?.title || "Stop highlight",
      blur: null,
      focalX: 50,
      focalY: 50,
    };
  }
  if (itinerary?.cover_image_path) {
    return {
      path: itinerary.cover_image_path,
      alt: itinerary.cover_alt || itinerary.title || "Trip cover",
      blur: null,
      focalX: 50,
      focalY: 50,
    };
  }
  return null;
}

export default function HeroStage({
  itinerary,
  day,
  isToday,
  nextStop,
  busLiveStatus = "offline",
  isRealtimeLive = false,
  scrollProgress = 0,
  reducedMotion = false,
  onBack,
  onViewPlan,
}) {
  const media = resolveHeroImage(day, itinerary);
  const { heroUrl, thumbUrl } = media ? getMediaUrls(media.path) : { heroUrl: "", thumbUrl: "" };
  const dateLabel = formatShortDate(day?.date);
  const eyebrow = isToday
    ? `DAY ${day?.day_number ?? 1} · LIVE NOW`
    : `DAY ${day?.day_number ?? 1}${dateLabel ? ` · ${dateLabel}` : ""}`;

  // Parallax up to 12% unless reduced motion is enabled
  const parallaxY = reducedMotion ? 0 : Math.round(scrollProgress * 12);

  return (
    <section
      aria-label={`Day ${day?.day_number ?? 1} overview`}
      className="relative overflow-hidden bg-gradient-to-br from-[#065F46] via-[#064e3b] to-[#022c22] text-white"
      style={{
        minHeight: reducedMotion ? "38dvh" : `${Math.round(72 - scrollProgress * 34)}dvh`,
      }}
    >
      {/* Background image or branded gradient */}
      {media && heroUrl ? (
        <div
          className="absolute inset-0 overflow-hidden"
          style={
            media.blur
              ? {
                  backgroundImage: `url("${media.blur}")`,
                  backgroundSize: "cover",
                  backgroundPosition: `${media.focalX}% ${media.focalY}%`,
                }
              : undefined
          }
        >
          <img
            src={heroUrl}
            srcSet={thumbUrl && thumbUrl !== heroUrl ? `${thumbUrl} 480w, ${heroUrl} 1600w` : undefined}
            sizes="100vw"
            alt={media.alt}
            fetchPriority="high"
            className="h-full w-full object-cover transition-opacity duration-300"
            style={{
              objectPosition: `${media.focalX}% ${media.focalY}%`,
              transform: reducedMotion ? "none" : `translateY(${parallaxY}%) scale(1.06)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-[#03231b]/90" />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
          <Compass size={220} className="text-emerald-200" />
        </div>
      )}

      {/* Compact Top Bar (always visible, shows Back + place name + Live chip) */}
      <div className="relative z-20 flex items-center justify-between gap-3 px-4 pt-4 sm:px-6">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <span
            className="truncate text-sm font-bold text-white drop-shadow"
            style={{ opacity: reducedMotion ? 1 : Math.min(1, scrollProgress * 1.4 + 0.15) }}
          >
            {day?.title || itinerary?.title}
          </span>
        </div>

        {(busLiveStatus === "live" || isRealtimeLive) && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#065F46]/90 px-3 py-1.5 text-[11px] font-extrabold text-white ring-1 ring-white/25 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#10B981] motion-safe:animate-pulse" />
            <Radio size={12} className="text-emerald-300" />
            <span>{busLiveStatus === "live" ? "Live Bus" : "Live"}</span>
          </span>
        )}
      </div>

      {/* Centered Notch + Title */}
      <div
        className="relative z-10 flex flex-col items-center justify-center py-6 sm:py-10"
        style={{
          opacity: reducedMotion ? 1 : Math.max(0.2, 1 - scrollProgress * 0.75),
          transform: reducedMotion ? "none" : `translateY(${Math.round(-scrollProgress * 14)}px)`,
        }}
      >
        <NotchTitle
          eyebrow={eyebrow}
          title={day?.title || `Day ${day?.day_number ?? 1}`}
          isToday={isToday}
        />
        {day?.subtitle && (
          <p className="mt-2 max-w-md px-6 text-center text-xs sm:text-sm font-medium text-white/90 drop-shadow">
            {day.subtitle}
          </p>
        )}
      </div>

      {/* Bottom Hero Panel (fades out as user scrolls into sheet) */}
      {(!reducedMotion && scrollProgress < 0.85) && (
        <div
          style={{
            opacity: Math.max(0, 1 - scrollProgress * 1.6),
            transform: `translateY(${Math.round(scrollProgress * 18)}px)`,
          }}
        >
          <HeroPanel
            itineraryTitle={itinerary?.title}
            itinerarySubtitle={itinerary?.subtitle}
            nextStop={nextStop}
            onViewPlan={onViewPlan}
          />
        </div>
      )}
    </section>
  );
}
