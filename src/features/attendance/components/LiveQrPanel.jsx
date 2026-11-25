import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2, RefreshCw, Lock, WifiOff, Users } from 'lucide-react';
import { useSessionQr } from '../hooks/useSessionQr';
import { PURPOSE_LABELS } from '../api/attendanceApi';

const LazyQRCodeSVG = lazy(() =>
  import('qrcode.react').then((mod) => ({ default: mod.QRCodeSVG }))
);

export default function LiveQrPanel({ session, summary }) {
  const isActive = (session?.effectiveStatus || session?.status) === 'active';
  const { qrData, loading, reconnecting, secondsLeft, refreshNow } = useSessionQr(
    session?.id,
    { enabled: Boolean(session?.id && isActive) }
  );

  const [fullscreen, setFullscreen] = useState(false);

  // Screen Wake Lock when fullscreen is open
  useEffect(() => {
    if (!fullscreen || typeof navigator === 'undefined' || !navigator.wakeLock) return;
    let wakeLock = null;
    navigator.wakeLock
      .request('screen')
      .then((lock) => {
        wakeLock = lock;
      })
      .catch(() => {
        // Silent fallback if wake lock denied or unsupported
      });
    return () => {
      wakeLock?.release?.().catch(() => {});
    };
  }, [fullscreen]);

  const handleEsc = useCallback((e) => {
    if (e.key === 'Escape') setFullscreen(false);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [fullscreen, handleEsc]);

  const rotateSeconds = qrData?.rotateSeconds || session?.rotate_seconds || 30;
  const progress = Math.min(1, Math.max(0, secondsLeft / rotateSeconds));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const renderQrBox = (size) => {
    if (!isActive || qrData?.sessionStatus === 'closed' || qrData?.sessionStatus === 'cancelled') {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-600">
            <Lock size={22} />
          </div>
          <p className="font-bold text-gray-900">Session closed</p>
          <p className="mt-1 text-xs text-gray-500">
            QR scanning is disabled. Staff can still mark attendance manually.
          </p>
        </div>
      );
    }

    if (loading && !qrData?.url) {
      return (
        <div
          className="flex items-center justify-center rounded-2xl bg-gray-100 animate-pulse"
          style={{ width: size + 32, height: size + 32 }}
        >
          <span className="text-xs font-semibold text-gray-500">Generating QR…</span>
        </div>
      );
    }

    return (
      <div className="relative inline-flex flex-col items-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <Suspense
            fallback={
              <div
                className="flex items-center justify-center bg-gray-50 text-xs text-gray-400"
                style={{ width: size, height: size }}
              >
                Loading QR…
              </div>
            }
          >
            {qrData?.url ? (
              <LazyQRCodeSVG
                key={qrData.slot}
                value={qrData.url}
                size={size}
                level="M"
                includeMargin
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            ) : null}
          </Suspense>
        </div>

        {reconnecting && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/95 p-4 text-center backdrop-blur-xs"
          >
            <WifiOff size={28} className="mb-2 text-amber-600" />
            <p className="text-sm font-bold text-gray-900">Reconnecting…</p>
            <p className="mt-1 text-xs text-gray-500">Waiting for live server connection</p>
            <button
              type="button"
              onClick={refreshNow}
              className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
            >
              <RefreshCw size={14} /> Retry now
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              {PURPOSE_LABELS[session?.purpose] || session?.purpose || 'Attendance'}
            </span>
            <h2 className="mt-1.5 text-lg font-extrabold text-emerald-950">{session?.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            {isActive && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-2.5 py-1.5" title="QR refresh countdown">
                <svg className="h-10 w-10 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
                  <circle
                    cx="22"
                    cy="22"
                    r={radius}
                    fill="none"
                    stroke="#D1FAE5"
                    strokeWidth="4"
                  />
                  <circle
                    cx="22"
                    cy="22"
                    r={radius}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-xs font-extrabold tabular-nums text-emerald-900">
                  {secondsLeft}s
                </span>
              </div>
            )}

            {isActive && (
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition"
              >
                <Maximize2 size={15} />
                <span>Show to students</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-2">
          {renderQrBox(280)}
          <p className="mt-3 text-center text-xs text-gray-500">
            Students scan this code with the <strong>IV Connect</strong> scanner or phone camera.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-gray-600">
            <Users size={14} className="text-emerald-700" />
            Present: <strong className="text-emerald-950">{summary?.present ?? 0}</strong> /{' '}
            {summary?.total ?? 0}
          </span>
          {isActive && (
            <button
              type="button"
              onClick={refreshNow}
              className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900"
            >
              <RefreshCw size={13} /> Refresh QR
            </button>
          )}
        </div>
      </div>

      {fullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen Attendance QR"
          className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-emerald-950 p-6 text-white"
        >
          <div className="flex w-full max-w-2xl items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                {PURPOSE_LABELS[session?.purpose] || session?.purpose}
              </p>
              <h2 className="text-xl font-extrabold">{session?.title}</h2>
            </div>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              <Minimize2 size={16} /> Close
            </button>
          </div>

          <div className="flex flex-col items-center justify-center">
            {renderQrBox(320)}
            <p className="mt-4 text-sm font-semibold text-emerald-200 tabular-nums">
              Refreshes in {secondsLeft}s
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold">
            <Users size={18} className="text-emerald-300" />
            <span>
              Present: {summary?.present ?? 0} / {summary?.total ?? 0} ({summary?.percent ?? 0}%)
            </span>
          </div>
        </div>
      )}
    </>
  );
}
