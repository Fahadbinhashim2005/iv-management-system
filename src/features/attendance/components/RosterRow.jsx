import { CheckCircle2, QrCode, UserCheck, Undo2, Clock } from 'lucide-react';

function getInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';
}

export default function RosterRow({
  student,
  isPresent,
  selected,
  onToggleSelect,
  onMarkPresent,
  onMarkAbsent,
  disabled,
}) {
  const timeLabel = student.markedAt
    ? new Date(student.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3.5 transition hover:border-emerald-200">
      <div className="flex items-center gap-3 min-w-0">
        {!isPresent && (
          <input
            type="checkbox"
            checked={Boolean(selected)}
            onChange={() => onToggleSelect(student.id)}
            disabled={disabled}
            aria-label={`Select ${student.name}`}
            className="h-5 w-5 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
          />
        )}

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
            isPresent ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'
          }`}
        >
          {getInitials(student.name)}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-emerald-950">{student.name}</p>
            {student.rollNumber && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600">
                {student.rollNumber}
              </span>
            )}
          </div>

          {isPresent ? (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <CheckCircle2 size={13} /> Present · {timeLabel}
              </span>
              {student.method === 'qr' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  <QrCode size={11} /> QR {student.viaName ? `via ${student.viaName}` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                  <UserCheck size={11} /> Manual {student.markedByName ? `by ${student.markedByName}` : ''}
                </span>
              )}
              {student.note && (
                <span className="italic text-gray-500">“{student.note}”</span>
              )}
            </div>
          ) : (
            <div className="mt-0.5 flex items-center gap-2 text-xs text-amber-700">
              <Clock size={12} />
              <span>Absent</span>
              {student.department && (
                <span className="text-gray-400">· {student.department}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isPresent ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onMarkAbsent(student)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            <Undo2 size={14} /> Mark absent
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onMarkPresent(student)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            <UserCheck size={14} /> Mark present
          </button>
        )}
      </div>
    </div>
  );
}
