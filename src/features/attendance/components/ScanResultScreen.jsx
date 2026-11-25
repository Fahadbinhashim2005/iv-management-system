import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { PURPOSE_LABELS } from '../api/attendanceApi';

export default function ScanResultScreen({ result, error, onScanAgain }) {
  useEffect(() => {
    if (result && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(200);
      } catch {
        // Ignore vibrate errors
      }
    }
  }, [result]);

  if (result) {
    const timeStr = result.markedAt
      ? new Date(result.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <div
        role="status"
        aria-live="polite"
        className="mx-auto max-w-md rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-md"
      >
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 motion-safe:animate-bounce">
          <CheckCircle2 size={44} />
        </div>

        <h2 className="text-2xl font-extrabold text-emerald-950">
          {result.alreadyMarked ? 'Already Marked ✓' : 'Attendance Marked!'}
        </h2>
        <p className="mt-1 text-sm font-semibold text-emerald-700">
          {result.session?.title || 'Attendance Session'}
        </p>
        {result.session?.purpose && (
          <span className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            {PURPOSE_LABELS[result.session.purpose] || result.session.purpose}
          </span>
        )}

        <p className="mt-4 text-xs text-gray-500">
          {result.alreadyMarked
            ? `Your attendance was already recorded at ${timeStr}.`
            : `Recorded at ${timeStr}.`}
        </p>

        <Link
          to="/student/attendance"
          className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-800 transition"
        >
          Done
        </Link>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="mx-auto max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-md"
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle size={34} />
      </div>

      <h2 className="text-xl font-extrabold text-gray-900">Could not mark attendance</h2>
      <p className="mt-2 text-sm text-gray-600">{error || "This isn't a valid attendance QR."}</p>

      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onScanAgain}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-extrabold text-white hover:bg-emerald-800 transition"
        >
          <RefreshCw size={16} /> Scan again
        </button>
        <Link
          to="/student/attendance"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-gray-200 px-6 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
        >
          Back to Attendance
        </Link>
      </div>
    </div>
  );
}
