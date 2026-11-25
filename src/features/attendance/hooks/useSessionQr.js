import { useState, useEffect, useRef, useCallback } from 'react';
import { attendanceApi } from '../api/attendanceApi';

export function useSessionQr(sessionId, { enabled = true } = {}) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const serverOffsetRef = useRef(0);
  const backoffRef = useRef(1000);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const fetchQrRef = useRef(null);

  const fetchQr = useCallback(async () => {
    if (!sessionId || !enabled) return;
    try {
      const data = await attendanceApi.getSessionQr(sessionId);
      if (!mountedRef.current) return;

      if (data.serverTime) {
        serverOffsetRef.current = new Date(data.serverTime).getTime() - Date.now();
      }
      backoffRef.current = 1000;
      setQrData(data);
      setReconnecting(false);
      setError(null);
      setLoading(false);

      if (data.sessionStatus === 'active') {
        const rotateMs = (data.rotateSeconds || 30) * 1000;
        const nextDelay = Math.max(4000, Math.round(rotateMs * 0.75));
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => fetchQrRef.current?.(), nextDelay);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setLoading(false);
      setError(err.message || 'Unable to refresh QR');

      const delay = backoffRef.current;
      backoffRef.current = Math.min(10000, backoffRef.current * 2);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fetchQrRef.current?.(), delay);
    }
  }, [sessionId, enabled]);

  useEffect(() => {
    fetchQrRef.current = fetchQr;
  }, [fetchQr]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled && sessionId) {
      const initId = setTimeout(fetchQr, 0);
      return () => {
        clearTimeout(initId);
        mountedRef.current = false;
        clearTimeout(timerRef.current);
      };
    }
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, [fetchQr, enabled, sessionId]);

  useEffect(() => {
    if (!qrData?.expiresAt || qrData?.sessionStatus !== 'active') return;
    const tick = () => {
      const serverNow = Date.now() + serverOffsetRef.current;
      const expMs = new Date(qrData.expiresAt).getTime();
      const left = Math.max(0, Math.ceil((expMs - serverNow) / 1000));
      setSecondsLeft(left);
      if (left === 0 && error) {
        setReconnecting(true);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [qrData, error]);

  return {
    qrData,
    loading,
    reconnecting,
    error,
    secondsLeft,
    refreshNow: fetchQr,
  };
}
