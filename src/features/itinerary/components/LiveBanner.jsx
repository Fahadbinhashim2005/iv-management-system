import { Radio, AlertTriangle, RefreshCw } from "lucide-react";

export default function LiveBanner({ isPublished, conflict, onReload }) {
  if (!isPublished && !conflict) return null;

  return (
    <div className="space-y-2">
      {isPublished && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-[#065F46] px-4 py-2.5 text-xs font-extrabold text-white shadow-xs"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-[#10B981] motion-safe:animate-pulse" />
          <Radio size={14} className="text-emerald-300 shrink-0" />
          <span>Live — changes are visible to students instantly</span>
        </div>
      )}

      {conflict && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-950"
        >
          <span className="inline-flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-700 shrink-0" />
            <span>Updated by someone else — reload?</span>
          </span>
          {onReload && (
            <button
              type="button"
              onClick={onReload}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-amber-700 px-3.5 py-1.5 font-bold text-white hover:bg-amber-800"
            >
              <RefreshCw size={13} /> Reload
            </button>
          )}
        </div>
      )}
    </div>
  );
}
