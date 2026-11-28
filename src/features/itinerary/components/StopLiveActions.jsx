import { useState } from "react";
import { Clock, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { itineraryApi } from "../api/itineraryApi";

const STATUS_ACTIONS = [
  { value: "now", label: "Now", tone: "bg-amber-500 text-white hover:bg-amber-600" },
  { value: "done", label: "Done", tone: "bg-[#065F46] text-white hover:bg-emerald-900" },
  { value: "delayed", label: "Delayed", tone: "bg-amber-100 text-amber-900 hover:bg-amber-200" },
  { value: "skipped", label: "Skipped", tone: "bg-gray-200 text-gray-800 hover:bg-gray-300" },
];

export default function StopLiveActions({ stop, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [showShift, setShowShift] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("15");

  const handleOverride = async (nextStatus) => {
    setBusy(true);
    try {
      await itineraryApi.setStopOverride(stop.id, nextStatus);
      toast.success(
        nextStatus ? `Marked "${stop.title}" as ${nextStatus.toUpperCase()}.` : "Reset to schedule time."
      );
      await onChanged?.();
    } catch (err) {
      toast.error(err?.message || "Could not update stop status.");
    } finally {
      setBusy(false);
    }
  };

  const handleShift = async (delta) => {
    const mins = Number(delta);
    if (!Number.isFinite(mins) || mins === 0) {
      toast.error("Enter a non-zero number of minutes.");
      return;
    }
    setBusy(true);
    try {
      const count = await itineraryApi.shiftFrom(stop.id, mins);
      toast.success(
        `Shifted ${count ?? 0} later stop${count === 1 ? "" : "s"} by ${mins > 0 ? `+${mins}` : mins} min.`
      );
      setShowShift(false);
      await onChanged?.();
    } catch (err) {
      toast.error(err?.message || "Could not shift later stops.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_ACTIONS.map((act) => {
          const active = stop.status_override === act.value;
          return (
            <button
              key={act.value}
              type="button"
              disabled={busy}
              aria-pressed={active}
              onClick={() => handleOverride(active ? null : act.value)}
              className={`min-h-[36px] rounded-xl px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                active
                  ? `${act.tone} ring-2 ring-offset-1 ring-emerald-700`
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {act.label}
            </button>
          );
        })}

        {stop.status_override && (
          <button
            type="button"
            disabled={busy}
            onClick={() => handleOverride(null)}
            title="Clear manual override"
            className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
          >
            <RotateCcw size={12} /> Auto
          </button>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => setShowShift((v) => !v)}
          className="ml-auto inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100"
        >
          <Clock size={12} /> Shift later
        </button>
      </div>

      {showShift && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleShift(15)}
            className="min-h-[34px] rounded-lg bg-white px-2.5 py-1 font-bold text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            +15m
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleShift(30)}
            className="min-h-[34px] rounded-lg bg-white px-2.5 py-1 font-bold text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            +30m
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleShift(-15)}
            className="min-h-[34px] rounded-lg bg-white px-2.5 py-1 font-bold text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
          >
            -15m
          </button>
          <div className="flex items-center gap-1 ml-auto">
            <input
              type="number"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              aria-label="Custom shift minutes"
              className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => handleShift(customMinutes)}
              className="min-h-[34px] rounded-lg bg-[#065F46] px-2.5 py-1 font-bold text-white hover:bg-emerald-900"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
