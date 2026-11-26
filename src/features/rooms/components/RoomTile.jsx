import { memo } from 'react';
import { Lock, Ban, CheckCircle2, Loader2, Check } from 'lucide-react';
import { hexToRgba } from '../utils/eligibility';

const RoomTile = memo(function RoomTile({
  room,
  isMine,
  eligible,
  isStaffMode = false,
  isPending = false,
  isSelectedForBulk = false,
  bulkSelectMode = false,
  onClick,
}) {
  const occ = Number(room.occupant_count) || 0;
  const cap = Math.max(1, Number(room.capacity) || 1);
  const isFull = occ >= cap;
  const isLocked = Boolean(room.is_locked);
  const pct = Math.min(100, Math.round((occ / cap) * 100));
  const color = room.color_hex || '#3B82F6';

  // Determine visual state
  // Staff can always inspect every tile; students see dimmed/disabled states for full/locked/ineligible
  let cardStyle;
  let containerClass =
    'relative flex min-h-[88px] w-full flex-col justify-between rounded-2xl border p-2.5 text-left transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-emerald-500 ';

  if (isMine) {
    // My selected room POPS: full saturation, thick ring, glow, slight scale-up, check badge
    cardStyle = {
      backgroundColor: color,
      borderColor: '#FFFFFF',
      boxShadow: `0 0 0 3px ${color}, 0 10px 24px -4px ${hexToRgba(color, 0.55)}`,
    };
    containerClass += 'text-white scale-[1.03] z-10 cursor-pointer active:scale-100';
  } else if (!isStaffMode && !eligible) {
    // Not eligible for caller
    cardStyle = {
      backgroundColor: '#F3F4F6',
      borderColor: '#E5E7EB',
    };
    containerClass += 'text-gray-500 cursor-pointer opacity-75 hover:opacity-90';
  } else if (isLocked) {
    cardStyle = {
      backgroundColor: hexToRgba(color, 0.1),
      borderColor: hexToRgba(color, 0.25),
    };
    containerClass += isStaffMode
      ? 'text-gray-700 cursor-pointer opacity-75 hover:opacity-100'
      : 'text-gray-500 cursor-pointer opacity-60';
  } else if (isFull) {
    // Full / occupied: dimmed version of type colour (~35% opacity), muted text
    cardStyle = {
      backgroundColor: hexToRgba(color, 0.14),
      borderColor: hexToRgba(color, 0.3),
    };
    containerClass += isStaffMode
      ? 'text-gray-800 cursor-pointer opacity-75 hover:opacity-100'
      : 'text-gray-500 cursor-not-allowed opacity-45';
  } else {
    // Available or partially filled: full type colour border & rich tint
    cardStyle = {
      backgroundColor: hexToRgba(color, 0.12),
      borderColor: color,
    };
    containerClass +=
      'text-gray-900 cursor-pointer hover:shadow-md active:scale-[0.97]';
  }

  if (isSelectedForBulk) {
    containerClass += ' ring-3 ring-emerald-700 ring-offset-1';
  }

  const disabledForStudent = !isStaffMode && !isMine && isFull && eligible && !isLocked;

  return (
    <button
      type="button"
      onClick={() => onClick?.(room)}
      disabled={disabledForStudent || isPending}
      aria-label={`Room ${room.room_no}, ${room.type_label}, ${occ} of ${cap} beds occupied${
        isMine ? ', your room' : isLocked ? ', locked' : isFull ? ', full' : ''
      }`}
      style={cardStyle}
      className={containerClass}
    >
      {/* Top Row: Room No + Status Icon */}
      <div className="flex items-start justify-between gap-1">
        <span
          className={`text-sm font-black tracking-tight leading-tight truncate ${
            isMine ? 'text-white' : 'text-gray-900'
          }`}
        >
          {room.room_no}
        </span>

        {bulkSelectMode ? (
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
              isSelectedForBulk
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-gray-400 bg-white'
            }`}
          >
            {isSelectedForBulk && <Check size={11} strokeWidth={3} />}
          </span>
        ) : isMine ? (
          <CheckCircle2 size={16} className="shrink-0 text-white drop-shadow-xs" />
        ) : isLocked ? (
          <Lock size={13} className="shrink-0 text-gray-600" />
        ) : !isStaffMode && !eligible ? (
          <Ban size={13} className="shrink-0 text-gray-400" />
        ) : null}
      </div>

      {/* Middle Label */}
      <div className="mt-1 flex items-center justify-between gap-1">
        <span
          className={`truncate text-[10px] font-bold uppercase tracking-wide ${
            isMine ? 'text-white/95' : 'text-gray-600'
          }`}
          style={!isMine && (eligible || isStaffMode) && !isFull && !isLocked ? { color } : undefined}
        >
          {isMine ? 'Your room' : isLocked ? 'Locked' : isFull ? 'Full' : room.type_label}
        </span>
      </div>

      {/* Bottom: Occupancy count x/y + Fill bar */}
      <div className="mt-1.5 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-extrabold">
          <span className={isMine ? 'text-white' : 'text-gray-800'}>
            {occ}/{cap}
          </span>
          {!isMine && !isFull && !isLocked && (eligible || isStaffMode) && (
            <span className="text-[9px] font-bold text-gray-500">
              {cap - occ} left
            </span>
          )}
        </div>

        <div
          className={`h-1.5 w-full overflow-hidden rounded-full ${
            isMine ? 'bg-white/30' : 'bg-black/10'
          }`}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: isMine ? '#FFFFFF' : !isStaffMode && !eligible ? '#9CA3AF' : color,
            }}
          />
        </div>
      </div>

      {/* Pending Spinner Overlay */}
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/75 backdrop-blur-[1px]">
          <Loader2 size={20} className="animate-spin text-emerald-700" />
        </div>
      )}
    </button>
  );
});

export default RoomTile;
