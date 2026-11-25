import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, QrCode, AlertCircle, RefreshCw } from 'lucide-react';
import { attendanceApi } from '../api/attendanceApi';
import SessionCard from '../components/SessionCard';
import SessionForm from '../components/SessionForm';

export default function AdminAttendanceList() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

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

  const handleCreated = (created) => {
    setCreateOpen(false);
    navigate(`/admin/attendance/${created.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-emerald-950">Attendance Sessions</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create roll-call sessions, display live rotating QR codes, and manage rosters.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 transition"
        >
          <Plus size={18} /> New attendance
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: '', label: 'All' },
          { value: 'active', label: 'Live' },
          { value: 'closed', label: 'Closed' },
          { value: 'cancelled', label: 'Cancelled' },
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
          {[1, 2, 3, 4].map((i) => (
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
            Start a new session to generate a live QR code for coordinators and students.
          </p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800"
          >
            <Plus size={16} /> New attendance
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} basePath="/admin/attendance" />
          ))}
        </div>
      )}

      <SessionForm
        open={createOpen}
        existingSessions={sessions}
        onCreated={handleCreated}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
