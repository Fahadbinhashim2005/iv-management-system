import { Bus, Clock, MapPin, Navigation, X } from "lucide-react";

export default function BusSheet({
  isOpen,
  onClose,
  busLocation,
  busStatus,
  ageSeconds,
  projection,
}) {
  if (!isOpen || !busLocation) return null;

  const isLive = busStatus === "live";
  const minsAgo = ageSeconds !== null ? Math.max(1, Math.round(ageSeconds / 60)) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Bus Details"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white ${
                isLive ? "bg-[#065F46]" : "bg-gray-500"
              }`}
            >
              <Bus size={22} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-emerald-950">
                {busLocation.bus_id}
              </h3>
              <p className="text-xs font-semibold text-gray-600">
                {isLive
                  ? `Live · updated ${ageSeconds ?? 0}s ago`
                  : `Stale · last seen ${minsAgo ?? 2} min ago`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close bus details"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl bg-gray-50 p-3.5">
            <span className="inline-flex items-center gap-1 font-bold text-gray-500 uppercase text-[10px]">
              <Clock size={12} /> Est. Arrival
            </span>
            <p className="mt-1 text-base font-black text-emerald-950">
              {projection ? `~${projection.etaMinutes} min` : "En route"}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-3.5">
            <span className="inline-flex items-center gap-1 font-bold text-gray-500 uppercase text-[10px]">
              <MapPin size={12} /> Next Stop Dist.
            </span>
            <p className="mt-1 text-base font-black text-emerald-950">
              {projection ? `~${projection.distanceToNextKm} km` : "—"}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-3.5">
            <span className="inline-flex items-center gap-1 font-bold text-gray-500 uppercase text-[10px]">
              <Navigation size={12} /> GPS Accuracy
            </span>
            <p className="mt-1 font-bold text-gray-800">
              {busLocation.accuracy_m != null ? `±${busLocation.accuracy_m} m` : "Standard"}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-3.5">
            <span className="font-bold text-gray-500 uppercase text-[10px]">Speed</span>
            <p className="mt-1 font-bold text-gray-800">
              {busLocation.speed_kmh != null ? `${busLocation.speed_kmh} km/h` : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
