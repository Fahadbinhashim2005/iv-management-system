import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatesApi } from '../api/updatesApi';
import { triggerAnnouncementAlert } from '../utils/notificationAlert.jsx';

const SEEN_STORAGE_KEY = 'iv_seen_announcement_ids';

export const AnnouncementAlertsContext = createContext(null);

function getStoredSeenIds() {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? new Set(parsed) : null;
  } catch {
    return null;
  }
}

function saveSeenIds(ids) {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(Array.from(ids).slice(0, 200)));
  } catch {
    // Ignore storage quota errors
  }
}

export function useAnnouncementAlerts({
  pollIntervalMs = 5000,
  enableAlerts = true,
  standalone = false,
} = {}) {
  const sharedCtx = useContext(AnnouncementAlertsContext);
  const shouldPoll = standalone || !sharedCtx;

  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(shouldPoll);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = useRef(true);

  const fetchUpdates = useCallback(async () => {
    if (!shouldPoll) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    try {
      const list = await updatesApi.getAll();
      if (!mountedRef.current) return;
      const items = Array.isArray(list) ? list : [];
      setAnnouncements(items);
      setError(null);
      setLoading(false);

      if (!enableAlerts || items.length === 0) return;

      const seen = getStoredSeenIds();
      if (!seen) {
        saveSeenIds(new Set(items.map((a) => a.id)));
        return;
      }

      const newlyArrived = items.filter((a) => !seen.has(a.id));
      if (newlyArrived.length > 0) {
        const updatedSeen = new Set(seen);
        newlyArrived.forEach((a) => updatedSeen.add(a.id));
        saveSeenIds(updatedSeen);
        setUnreadCount((c) => c + newlyArrived.length);

        triggerAnnouncementAlert(newlyArrived[0], {
          onView: () => navigate('/student/announcements'),
        });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || 'Failed to load updates');
      setLoading(false);
    }
  }, [enableAlerts, navigate, shouldPoll]);

  useEffect(() => {
    mountedRef.current = true;
    if (!shouldPoll) return;

    const initTimer = setTimeout(() => {
      if (document.visibilityState !== 'hidden') {
        fetchUpdates();
      }
    }, 0);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUpdates();
      }
    }, pollIntervalMs);

    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchUpdates();
      }
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);

    return () => {
      mountedRef.current = false;
      clearTimeout(initTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchUpdates, pollIntervalMs, shouldPoll]);

  const markAllSeen = useCallback(() => {
    setUnreadCount(0);
    if (announcements.length > 0) {
      saveSeenIds(new Set(announcements.map((a) => a.id)));
    }
  }, [announcements]);

  if (!standalone && sharedCtx) {
    return sharedCtx;
  }

  return {
    announcements,
    unreadCount,
    loading,
    error,
    refresh: fetchUpdates,
    markAllSeen,
  };
}
