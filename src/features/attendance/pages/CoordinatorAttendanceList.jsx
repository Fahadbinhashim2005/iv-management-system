import { useState, useEffect, useCallback } from 'react';
import { QrCode, AlertCircle, RefreshCw } from 'lucide-react';
import { attendanceApi } from '../api/attendanceApi';
import SessionCard from '../components/SessionCard';

export default function CoordinatorAttendanceList() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const loadSessions = useCallback(async () => {
    try {
      const data = await attendanceApi.listSessions(
        statusFilter ? { status: statusFilter } : {}
      );
      setSessions(data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load attendance sessions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const t = setTimeout(loadSessions, 0);
    return () => clearTimeout(t);
  }, [loadSessions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-emerald-950">Live Attendance</h1>
        <p className="mt-1 text-sm text-gray-600">
          Display your session QR code for students to scan and manage manual roll-call.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: '', label: 'All' },
          { value: 'active', label: 'Live' },
          { value: 'closed', label: 'Closed' },
        ].map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`min-h-[38px] rounded-xl px-4 py-1.5 text-xs font-bold transition ${
              statusFilter === f.value
                ? 'bg-emerald-800 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-white animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle size={28} className="mx-auto mb-2 text-red-600" />
          <p className="text-sm font-bold text-red-900">{error}</p>
          <button
            type="button"
            onClick={loadSessions}
            className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <QrCode size={24} />
          </div>
          <h3 className="text-base font-extrabold text-emerald-950">No attendance sessions yet</h3>
          <p className="mt-1 text-xs text-gray-500">
            When an Admin starts an attendance session for your assigned visit, it will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} basePath="/coordinator/attendance" />
          ))}
        </div>
      )}
    </div>
  );
}
