import { useState } from "react";
import {
  Bus,
  Building2,
  Factory,
  Compass,
  Utensils,
  Coffee,
  MapPin,
  Clock,
  ChevronDown,
  ExternalLink,
  StickyNote,
} from "lucide-react";
import { formatDuration } from "../lib/time";
import { buildGoogleMapsUrl } from "../lib/mapsLink";
import { getMediaUrls } from "../api/itineraryApi";

const CATEGORY_META = {
  travel: { icon: Bus, tone: "bg-blue-50 text-blue-700" },
  stay: { icon: Building2, tone: "bg-purple-50 text-purple-700" },
  industry: { icon: Factory, tone: "bg-emerald-50 text-emerald-800" },
  activity: { icon: Compass, tone: "bg-amber-50 text-amber-800" },
  meal: { icon: Utensils, tone: "bg-orange-50 text-orange-700" },
  free: { icon: Coffee, tone: "bg-gray-100 text-gray-700" },
};

export default function StopCard({
  stop,
  showStaffNote = false,
  renderStaffActions = null,
}) {
  const [expanded, setExpanded] = useState(false);

  const meta = CATEGORY_META[stop.category] || CATEGORY_META.activity;
  const Icon = meta.icon;
  const duration = !stop.time_tbc ? formatDuration(stop.start_time, stop.end_time) : "";
  const mapsUrl =
    stop.lat != null && stop.lng != null ? buildGoogleMapsUrl(stop.lat, stop.lng) : "";
  const { heroUrl, thumbUrl } = stop.image_path
    ? getMediaUrls(stop.image_path)
    : { heroUrl: "", thumbUrl: "" };

  const isNow = stop.derivedStatus === "now";
  const isSkipped = stop.derivedStatus === "skipped";
  const isDelayed = stop.derivedStatus === "delayed";
  const hasExpandableDetails = Boolean(
    stop.description || heroUrl || mapsUrl || (showStaffNote && stop.staff_note)
  );

  return (
    <div
      className={`rounded-2xl border transition ${
        isNow
          ? "border-amber-300 bg-amber-50/70 shadow-sm"
          : isDelayed
          ? "border-amber-200 bg-amber-50/40"
          : isSkipped
          ? "border-gray-200 bg-gray-50/70 opacity-75"
          : "border-gray-100 bg-white shadow-xs hover:border-emerald-200"
      }`}
    >
      <button
        type="button"
        onClick={() => hasExpandableDetails && setExpanded((prev) => !prev)}
        aria-expanded={hasExpandableDetails ? expanded : undefined}
        className={`flex min-h-[64px] w-full items-center gap-3 p-3.5 text-left ${
          hasExpandableDetails ? "cursor-pointer" : "cursor-default"
        }`}
      >
        {/* Category or Thumbnail */}
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={stop.image_alt || stop.title}
            loading="lazy"
            className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-black/5"
          />
        ) : (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}
          >
            <Icon size={20} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4
              className={`text-sm font-extrabold text-[#111827] ${
                isSkipped ? "line-through text-gray-500" : ""
              }`}
            >
              {stop.title}
            </h4>
            {isNow && (
              <span className="rounded-full bg-[#F59E0B] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                NOW
              </span>
            )}
            {isDelayed && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                Delayed
              </span>
            )}
            {isSkipped && (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                Skipped
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-600">
            {stop.location && (
              <span className="inline-flex items-center gap-1 min-w-0">
                <MapPin size={12} className="shrink-0 text-emerald-700" />
                <span className="truncate">{stop.location}</span>
              </span>
            )}
            {duration && (
              <span className="inline-flex items-center gap-1 shrink-0 text-gray-500">
                <Clock size={12} />
                <span>{duration}</span>
              </span>
            )}
          </div>
        </div>

        {hasExpandableDetails && (
          <ChevronDown
            size={18}
            className={`shrink-0 text-gray-400 transition-transform ${
              expanded ? "rotate-180 text-emerald-700" : ""
            }`}
          />
        )}
      </button>

      {expanded && hasExpandableDetails && (
        <div className="border-t border-gray-100/80 px-4 pb-4 pt-3 space-y-3">
          {heroUrl && (
            <img
              src={heroUrl}
              srcSet={thumbUrl ? `${thumbUrl} 480w, ${heroUrl} 1600w` : undefined}
              sizes="(max-width: 640px) 100vw, 600px"
              alt={stop.image_alt || stop.title}
              loading="lazy"
              className="max-h-56 w-full rounded-xl object-cover"
            />
          )}

          {stop.description && (
            <p className="text-xs sm:text-sm leading-relaxed text-gray-700 whitespace-pre-line">
              {stop.description}
            </p>
          )}

          {showStaffNote && stop.staff_note && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-950">
              <StickyNote size={14} className="mt-0.5 shrink-0 text-amber-700" />
              <div>
                <span className="font-bold">Staff note: </span>
                <span>{stop.staff_note}</span>
              </div>
            </div>
          )}

          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#065F46] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-900"
            >
              <MapPin size={14} />
              <span>Open in Maps</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {renderStaffActions && (
        <div className="border-t border-gray-100 px-3.5 py-2.5">
          {renderStaffActions(stop)}
        </div>
      )}
    </div>
  );
}
