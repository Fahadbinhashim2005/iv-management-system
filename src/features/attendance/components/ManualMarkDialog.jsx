import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const PRESET_REASONS = [
  'Phone dead / no data',
  'Forgot to scan',
  'Other',
];

export default function ManualMarkDialog({
  open,
  mode = 'mark', // 'mark' | 'unmark'
  studentName = '',
  count = 1,
  onConfirm,
  onClose,
}) {
  const [preset, setPreset] = useState(mode === 'unmark' ? 'Other' : 'Phone dead / no data');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    cancelBtnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isUnmark = mode === 'unmark';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalReason =
      preset === 'Other' ? customReason.trim() : customReason.trim() || preset;

    if (isUnmark && !finalReason) {
      setError('Please provide a reason to mark this student absent.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onConfirm(finalReason);
      onClose();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-mark-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="manual-mark-title" className="text-lg font-extrabold text-emerald-950">
              {isUnmark
                ? `Mark ${studentName || 'student'} absent?`
                : count > 1
                  ? `Mark ${count} students present`
                  : `Mark ${studentName || 'student'} present`}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {isUnmark
                ? 'This removes their present record and logs an audit entry.'
                : 'Manual marks are recorded in the session audit log.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {!isUnmark && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Reason (optional)
              </label>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {PRESET_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isUnmark ? 'Reason (required)' : 'Additional note (optional)'}
            </label>
            <input
              type="text"
              maxLength={300}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder={isUnmark ? 'e.g. Marked wrong student' : 'Optional details...'}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              ref={cancelBtnRef}
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-xs font-bold text-white transition disabled:opacity-60 ${
                isUnmark ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {submitting ? 'Saving...' : isUnmark ? 'Confirm mark absent' : 'Confirm present'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
