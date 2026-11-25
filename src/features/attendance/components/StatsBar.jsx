import { CheckCircle2, Clock, Users } from 'lucide-react';

export default function StatsBar({ summary }) {
  const total = summary?.total ?? 0;
  const present = summary?.present ?? 0;
  const absent = summary?.absent ?? 0;
  const percent = summary?.percent ?? 0;

  return (
    <div className="sticky top-0 z-20 rounded-2xl border border-emerald-100 bg-white/95 p-4 shadow-xs backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-1.5 font-bold text-gray-700">
            <Users size={16} className="text-gray-500" />
            Total: <span className="text-emerald-950">{total}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
            <CheckCircle2 size={16} />
            Present: <span>{present}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-amber-700">
            <Clock size={16} />
            Absent: <span>{absent}</span>
          </span>
        </div>

        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-900 tabular-nums">
          {percent}% Present
        </span>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
