import { useState, useEffect, useCallback, useRef } from 'react';
import { attendanceApi } from '../api/attendanceApi';

export function useActiveSessions({ mode = 'staff', pollIntervalMs = 5000, enabled = true } = {}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetchActive = useCallback(async () => {
    if (!enabled) return;
    try {
      const data =
        mode === 'student'
          ? await attendanceApi.getStudentActive()
          : await attendanceApi.listSessions({ status: 'active' });
      if (!mountedRef.current) return;
      const filtered =
        mode === 'student'
          ? data
          : (data || []).filter((s) => s.effectiveStatus === 'active');
      setSessions(filtered);
      setError(null);
      setLoading(false);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || 'Failed to load active sessions');
      setLoading(false);
    }
  }, [mode, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      return;
    }

    const initTimer = setTimeout(fetchActive, 0);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchActive();
      }
    }, pollIntervalMs);

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        fetchActive();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);

    return () => {
      mountedRef.current = false;
      clearTimeout(initTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, [fetchActive, pollIntervalMs, enabled]);

  const hasUnmarked =
    mode === 'student' ? sessions.some((s) => !s.alreadyMarked) : sessions.length > 0;

  return {
    sessions,
    hasActive: sessions.length > 0,
    hasUnmarked,
    loading,
    error,
    refresh: fetchActive,
  };
}
