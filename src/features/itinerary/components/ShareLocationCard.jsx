import { useEffect, useState } from "react";
import { Radio, AlertCircle } from "lucide-react";
import { tripConfig } from "../../../config/tripConfig";
import { useShareLocation } from "../hooks/useShareLocation";

export default function ShareLocationCard({ itineraryId }) {
  const configuredBuses = Object.values(tripConfig.buses || {});
  const [busId, setBusId] = useState(configuredBuses[0]?.id || "BUS-01");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const { sharing, lastSentAt, accuracyM, error, startSharing, stopSharing } =
    useShareLocation({ busId: busId.trim(), itineraryId });

  useEffect(() => {
    if (!sharing) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sharing]);

  const secsAgo = lastSentAt ? Math.max(0, Math.round((nowMs - lastSentAt) / 1000)) : null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm text-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              sharing ? "bg-[#065F46] text-white" : "bg-emerald-50 text-emerald-800"
            }`}
          >
            <Radio size={18} className={sharing ? "motion-safe:animate-pulse" : ""} />
          </div>
          <div>
            <p className="font-extrabold text-emerald-950 text-sm">
              Share bus location
            </p>
            <p className="text-[11px] text-gray-600">
              {sharing
                ? `Sharing${secsAgo !== null ? ` · last sent ${secsAgo}s ago` : " · acquiring GPS"}${
                    accuracyM !== null ? ` · ±${accuracyM} m` : ""
                  }`
                : "Your phone's location will be visible to all trip participants while this is on."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {configuredBuses.length > 0 ? (
            <select
              aria-label="Select bus"
              disabled={sharing}
              value={busId}
              onChange={(e) => setBusId(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-bold text-gray-900 disabled:opacity-60"
            >
              {configuredBuses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.id}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              aria-label="Bus ID"
              disabled={sharing}
              value={busId}
              onChange={(e) => setBusId(e.target.value)}
              placeholder="BUS-01"
              className="w-24 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-bold text-gray-900 disabled:opacity-60"
            />
          )}

          <button
            type="button"
            onClick={sharing ? stopSharing : startSharing}
            className={`min-h-[42px] rounded-full px-4 py-2 text-xs font-extrabold text-white shadow-xs transition ${
              sharing
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#10B981] hover:bg-emerald-700"
            }`}
          >
            {sharing ? "Stop" : "Start Live"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-800">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-[11px] text-gray-500">
        Keep this page open and your screen on while broadcasting; mobile browsers pause GPS updates if the tab goes to the background or the screen locks.
      </p>
    </div>
  );
}
