import { useEffect, useState } from "react";
import { ChevronDown, History } from "lucide-react";
import { itineraryApi } from "../api/itineraryApi";

export default function ChangesLogPanel({ itineraryId, refreshKey = 0 }) {
  const [open, setOpen] = useState(false);
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !itineraryId) return;
    let active = true;
    const t = setTimeout(() => {
      setLoading(true);
      itineraryApi
        .listChanges(itineraryId, 25)
        .then((rows) => {
          if (active) setChanges(rows);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [open, itineraryId, refreshKey]);

  return (
    <div className="rounded-3xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[52px] w-full items-center justify-between px-5 py-3.5 text-left text-xs font-extrabold text-emerald-950 hover:bg-gray-50"
      >
        <span className="inline-flex items-center gap-2">
          <History size={16} className="text-emerald-700" />
          <span>Recent Changes (Audit Trail)</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 text-xs space-y-2.5 max-h-80 overflow-y-auto">
          {loading ? (
            <p className="text-gray-500">Loading recent changes...</p>
          ) : changes.length === 0 ? (
            <p className="text-gray-500">No changes logged yet.</p>
          ) : (
            changes.map((c) => {
              const title = c.after?.title || c.before?.title || c.entity;
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-900 mr-2">
                      {c.action}
                    </span>
                    <span className="font-bold text-gray-900">
                      {c.entity}: {title}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500">
                    {new Date(c.created_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
