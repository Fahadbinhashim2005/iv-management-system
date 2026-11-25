import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { attendanceApi } from '../api/attendanceApi';

export function useRoster(sessionId, { pollIntervalMs = 5000 } = {}) {
  const [roster, setRoster] = useState({
    summary: { total: 0, present: 0, absent: 0, percent: 0 },
    present: [],
    absent: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetchRoster = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await attendanceApi.getRoster(sessionId);
      if (!mountedRef.current) return;
      setRoster(data);
      setError(null);
      setLoading(false);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || 'Failed to load roster');
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    mountedRef.current = true;
    const initTimer = setTimeout(fetchRoster, 0);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRoster();
      }
    }, pollIntervalMs);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchRoster();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      mountedRef.current = false;
      clearTimeout(initTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [fetchRoster, pollIntervalMs]);

  const markStudents = useCallback(
    async (studentIds, reason) => {
      const prev = roster;
      const idSet = new Set(studentIds);
      const moving = prev.absent.filter((s) => idSet.has(s.id));
      const nowIso = new Date().toISOString();

      // Optimistic update
      const optimisticPresent = [
        ...moving.map((s) => ({
          ...s,
          markedAt: nowIso,
          method: 'manual',
          markedByName: 'You',
          note: reason || null,
        })),
        ...prev.present,
      ];
      const optimisticAbsent = prev.absent.filter((s) => !idSet.has(s.id));
      const total = prev.summary.total;
      const presentCount = optimisticPresent.length;

      setRoster({
        summary: {
          total,
          present: presentCount,
          absent: optimisticAbsent.length,
          percent: total > 0 ? Math.round((presentCount / total) * 100) : 0,
        },
        present: optimisticPresent,
        absent: optimisticAbsent,
      });

      try {
        const res = await attendanceApi.manualMark(sessionId, { studentIds, reason });
        toast.success(`Marked ${res.marked} student${res.marked === 1 ? '' : 's'} present`);
        await fetchRoster();
      } catch (err) {
        setRoster(prev);
        toast.error(err.message || 'Failed to mark student present');
        throw err;
      }
    },
    [roster, sessionId, fetchRoster]
  );

  const unmarkStudent = useCallback(
    async (studentId, reason) => {
      const prev = roster;
      const target = prev.present.find((s) => s.id === studentId);
      if (!target) return;

      const optimisticPresent = prev.present.filter((s) => s.id !== studentId);
      const optimisticAbsent = [
        {
          id: target.id,
          name: target.name,
          email: target.email,
          rollNumber: target.rollNumber,
          department: target.department,
          batch: target.batch,
          phone: target.phone,
        },
        ...prev.absent,
      ];
      const total = prev.summary.total;
      const presentCount = optimisticPresent.length;

      setRoster({
        summary: {
          total,
          present: presentCount,
          absent: optimisticAbsent.length,
          percent: total > 0 ? Math.round((presentCount / total) * 100) : 0,
        },
        present: optimisticPresent,
        absent: optimisticAbsent,
      });

      try {
        await attendanceApi.manualUnmark(sessionId, studentId, reason);
        toast.success(`Marked ${target.name} absent`);
        await fetchRoster();
      } catch (err) {
        setRoster(prev);
        toast.error(err.message || 'Failed to undo attendance');
        throw err;
      }
    },
    [roster, sessionId, fetchRoster]
  );

  return {
    roster,
    loading,
    error,
    refresh: fetchRoster,
    markStudents,
    unmarkStudent,
  };
}
