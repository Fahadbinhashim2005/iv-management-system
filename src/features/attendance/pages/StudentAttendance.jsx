import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, CheckCircle2, Clock, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import { attendanceApi, PURPOSE_LABELS } from '../api/attendanceApi';
import { useActiveSessions } from '../hooks/useActiveSessions';

export default function StudentAttendance() {
  const { sessions: activeSessions, loading: activeLoading, refresh: refreshActive } =
    useActiveSessions({ mode: 'student', pollIntervalMs: 5000 });

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await attendanceApi.getStudentHistory();
      setHistory(data || []);
      setHistoryError(null);
    } catch (err) {
      setHistoryError(err.message || 'Failed to load attendance history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadHistory, 0);
    return () => clearTimeout(t);
  }, [loadHistory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-emerald-950">Attendance</h1>
          <p className="mt-1 text-sm text-gray-600">
            Scan your coordinator&apos;s live QR code to mark yourself present.
          </p>
        </div>

        <Link
          to="/student/attendance/scan"
          className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-800 transition"
        >
          <QrCode size={18} /> Scan QR
        </Link>
      </div>

      {/* Active Sessions */}
      <section className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-emerald-900">
          Active Roll-Call
        </h2>

        {activeLoading ? (
          <div className="h-28 rounded-2xl bg-white animate-pulse border border-gray-100" />
        ) : activeSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-6 text-center">
            <p className="text-sm font-bold text-gray-700">No active attendance session right now</p>
            <p className="mt-1 text-xs text-gray-500">
              When your coordinator opens a roll-call, it will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {activeSessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                      {PURPOSE_LABELS[s.purpose] || s.purpose}
                    </span>
                    {s.alreadyMarked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                        <CheckCircle2 size={12} /> Marked ✓
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800">
                        <Clock size={12} /> Not marked
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-extrabold text-emerald-950">{s.title}</h3>
                  {s.details && <p className="mt-1 text-xs text-gray-500">{s.details}</p>}
                </div>

                {!s.alreadyMarked && (
                  <Link
                    to="/student/attendance/scan"
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-800 transition"
                  >
                    <QrCode size={16} /> Scan QR now
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-emerald-900">
            Attendance History
          </h2>
          <button
            type="button"
            onClick={() => {
              refreshActive();
              loadHistory();
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {historyLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-white animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : historyError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
            <AlertCircle size={24} className="mx-auto mb-1 text-red-600" />
            <p className="text-xs font-bold text-red-900">{historyError}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-xs text-gray-500">
            No past attendance records yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((item) => {
              const present = item.status === 'present';
              return (
                <div
                  key={item.sessionId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-emerald-950">
                      {item.sessionTitle}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {PURPOSE_LABELS[item.purpose] || item.purpose}
                      {item.markedAt
                        ? ` · ${new Date(item.markedAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                        : ''}
                    </p>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                      present
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {present ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {present ? 'Present' : 'Absent'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
