import { Link } from 'react-router-dom';
import { QrCode, Users, Clock, CheckCircle2, Lock, ChevronRight } from 'lucide-react';
import { PURPOSE_LABELS } from '../api/attendanceApi';

export default function SessionCard({ session, basePath }) {
  const status = session.effectiveStatus || session.status;
  const isActive = status === 'active';
  const total = session.counts?.total ?? 0;
  const present = session.counts?.present ?? 0;
  const percent = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <Link
      to={`${basePath}/${session.id}`}
      className="group block rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs transition hover:border-emerald-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                isActive
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {isActive ? <CheckCircle2 size={12} /> : <Lock size={12} />}
              {isActive ? 'Live' : status === 'cancelled' ? 'Cancelled' : 'Closed'}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              {PURPOSE_LABELS[session.purpose] || session.purpose}
            </span>
          </div>

          <h3 className="mt-2 truncate text-base font-extrabold text-emerald-950 group-hover:text-emerald-700">
            {session.title}
          </h3>
          {session.industrial_visits?.title && (
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {session.industrial_visits.title}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition">
          {isActive ? <QrCode size={18} /> : <ChevronRight size={18} />}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5 font-bold text-emerald-900">
          <Users size={14} className="text-emerald-700" />
          {present} / {total} Present ({percent}%)
        </span>
        <span className="inline-flex items-center gap-1 text-gray-400">
          <Clock size={13} />
          {new Date(session.created_at).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </Link>
  );
}
