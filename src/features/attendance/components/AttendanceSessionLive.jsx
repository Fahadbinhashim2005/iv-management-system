import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Download,
  Lock,
  RotateCcw,
  Trash2,
  History,
  AlertCircle,
} from 'lucide-react';
import { attendanceApi } from '../api/attendanceApi';
import { useRoster } from '../hooks/useRoster';
import LiveQrPanel from './LiveQrPanel';
import StatsBar from './StatsBar';
import RosterTabs from './RosterTabs';

export default function AttendanceSessionLive({ role = 'admin', backPath = '/admin/attendance' }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const isAdmin = role === 'admin';

  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const [viewTab, setViewTab] = useState('roster'); // 'roster' | 'audit'
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { roster, loading: rosterLoading, error: rosterError, refresh: refreshRoster, markStudents, unmarkStudent } =
    useRoster(sessionId);

  const loadSession = useCallback(async () => {
    try {
      const data = await attendanceApi.getSession(sessionId);
      setSession(data);
      setSessionError(null);
    } catch (err) {
      setSessionError(err.message || 'Failed to load session');
    } finally {
      setSessionLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const t = setTimeout(loadSession, 0);
    return () => clearTimeout(t);
  }, [loadSession]);

  useEffect(() => {
    if (!isAdmin || viewTab !== 'audit') return;
    let mounted = true;
    const loadAudit = async () => {
      setAuditLoading(true);
      try {
        const res = await attendanceApi.getAudit(sessionId);
        if (mounted) setAuditLogs(res.items || []);
      } catch (err) {
        toast.error(err.message || 'Failed to load audit logs');
      } finally {
        if (mounted) setAuditLoading(false);
      }
    };
    loadAudit();
    return () => {
      mounted = false;
    };
  }, [isAdmin, viewTab, sessionId]);

  const handleCloseSession = async () => {
    if (!window.confirm('Close this attendance session? QR scanning will stop immediately.')) return;
    setActionLoading(true);
    try {
      const updated = await attendanceApi.closeSession(sessionId);
      setSession(updated);
      toast.success('Session closed');
    } catch (err) {
      toast.error(err.message || 'Failed to close session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenSession = async () => {
    setActionLoading(true);
    try {
      const updated = await attendanceApi.reopenSession(sessionId);
      setSession(updated);
      toast.success('Session reopened');
    } catch (err) {
      toast.error(err.message || 'Failed to reopen session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSession = async () => {
    if (!window.confirm('Cancel and archive this session? It will be hidden from default lists.')) return;
    setActionLoading(true);
    try {
      await attendanceApi.cancelSession(sessionId);
      toast.success('Session cancelled');
      navigate(backPath);
    } catch (err) {
      toast.error(err.message || 'Failed to cancel session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      await attendanceApi.downloadCsv(sessionId, `attendance-${sessionId.slice(0, 8)}.csv`);
      toast.success('CSV exported');
    } catch (err) {
      toast.error(err.message || 'Failed to export CSV');
    }
  };

  if (sessionLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 w-48 rounded-xl bg-white animate-pulse" />
        <div className="h-80 rounded-2xl bg-white animate-pulse" />
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle size={32} className="mx-auto mb-2 text-red-600" />
        <p className="font-bold text-red-900">{sessionError || 'Session not found'}</p>
        <Link
          to={backPath}
          className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white"
        >
          <ArrowLeft size={14} /> Back to attendance
        </Link>
      </div>
    );
  }

  const effectiveStatus = session.effectiveStatus || session.status;
  const isCancelled = effectiveStatus === 'cancelled';

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={backPath}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft size={15} /> All Sessions
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
          >
            <Download size={15} /> Export CSV
          </button>

          {isAdmin && effectiveStatus === 'active' && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCloseSession}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              <Lock size={15} /> Close session
            </button>
          )}

          {isAdmin && effectiveStatus === 'closed' && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleReopenSession}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              <RotateCcw size={15} /> Reopen
            </button>
          )}

          {isAdmin && !isCancelled && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCancelSession}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 size={15} /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Main Split: QR + Roster */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <LiveQrPanel session={session} summary={roster.summary} />
          {session.details && (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-white p-4 text-xs text-gray-600">
              <p className="font-bold text-emerald-950 mb-1">Session details</p>
              <p>{session.details}</p>
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-7">
          <StatsBar summary={roster.summary} />

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewTab('roster')}
                className={`min-h-[40px] rounded-xl px-4 py-2 text-xs font-bold transition ${
                  viewTab === 'roster'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                Roster
              </button>
              <button
                type="button"
                onClick={() => setViewTab('audit')}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  viewTab === 'audit'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                <History size={14} /> Audit Trail
              </button>
            </div>
          )}

          {viewTab === 'roster' ? (
            <RosterTabs
              roster={roster}
              loading={rosterLoading}
              error={rosterError}
              onRefresh={refreshRoster}
              onMarkStudents={markStudents}
              onUnmarkStudent={unmarkStudent}
              disabled={isCancelled}
            />
          ) : (
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-xs">
              {auditLoading ? (
                <p className="py-6 text-center text-xs text-gray-500">Loading audit trail...</p>
              ) : auditLogs.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-500">No audit events recorded yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {auditLogs.map((entry) => (
                    <div key={entry.id} className="flex items-start justify-between gap-3 py-3 text-xs">
                      <div>
                        <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-bold text-gray-800">
                          {entry.action}
                        </span>
                        {entry.reason && (
                          <p className="mt-1 text-gray-600">Reason: {entry.reason}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-gray-400">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
