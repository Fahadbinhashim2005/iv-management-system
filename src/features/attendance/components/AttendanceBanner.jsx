import { Link, useLocation } from 'react-router-dom';
import { QrCode, ArrowRight } from 'lucide-react';
import { useActiveSessions } from '../hooks/useActiveSessions';

export default function AttendanceBanner({ basePath = '/coordinator/attendance' }) {
  const { pathname } = useLocation();
  const { sessions } = useActiveSessions({ mode: 'staff', pollIntervalMs: 5000 });

  if (!sessions || sessions.length === 0) return null;
  if (pathname.startsWith(`${basePath}/`)) return null;

  const latest = sessions[0];

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-800 to-emerald-700 px-5 py-4 text-white shadow-sm">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-emerald-300 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-300" />
        </span>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-200">
            Attendance Live ({sessions.length} active)
          </p>
          <p className="text-sm font-bold">{latest.title}</p>
        </div>
      </div>

      <Link
        to={`${basePath}/${latest.id}`}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-emerald-900 shadow-xs hover:bg-emerald-50 transition"
      >
        <QrCode size={16} />
        <span>Open QR</span>
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
