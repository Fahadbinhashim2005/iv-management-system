import { useEffect, useState } from 'react';
import {
  X,
  CheckCircle2,
  Lock,
  Ban,
  ArrowRightLeft,
  LogOut,
  Users,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { roomsApi } from '../api/roomsApi';
import { checkClientEligibility, getWindowBannerState } from '../utils/eligibility';

function StudentRoomSheetBody({
  room,
  stay,
  me,
  myRoom,
  onClose,
  onSelect,
  onRelease,
  onSwitch,
  busy = false,
}) {
  const isMine = Boolean(room && myRoom && room.id === myRoom.id);
  const [occupants, setOccupants] = useState([]);
  const [loadingOcc, setLoadingOcc] = useState(isMine);
  const [confirmRelease, setConfirmRelease] = useState(false);

  useEffect(() => {
    if (!room || !stay || !isMine) return;
    let cancelled = false;
    roomsApi
      .getOccupants(stay.id, room.id)
      .then((res) => {
        if (!cancelled) setOccupants(res?.occupants || []);
      })
      .catch(() => {
        if (!cancelled) setOccupants([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingOcc(false);
      });
    return () => {
      cancelled = true;
    };
  }, [room, stay, isMine]);

  const elig = checkClientEligibility(me?.profile, room, stay);
  const banner = getWindowBannerState(stay);
  const isFull = room.occupant_count >= room.capacity;
  const isLocked = Boolean(room.is_locked);

  const canAct = banner.isOpen && !isLocked && elig.eligible;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs">
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        role="dialog"
        aria-modal="true"
        aria-label={`Room ${room.room_no} details`}
      >
        {/* Drag handle on mobile */}
        <div className="mx-auto h-1 w-10 rounded-full bg-gray-200 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white font-black text-base shadow-sm"
              style={{ backgroundColor: room.color_hex || '#3B82F6' }}
            >
              {room.room_no}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-emerald-950">Room {room.room_no}</h3>
                {isMine && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                    <CheckCircle2 size={11} />
                    Your Room
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-gray-500">
                {room.type_label}
                {room.floor ? ` • ${room.floor}` : ''} • {room.occupant_count}/{room.capacity} beds
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status / Reason Block */}
        {!banner.isOpen && (
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs font-bold text-amber-900">
            <AlertCircle size={15} className="shrink-0" />
            <span>{banner.label}</span>
          </div>
        )}

        {isLocked && (
          <div className="flex items-center gap-2 rounded-2xl bg-gray-100 border border-gray-200 p-3 text-xs font-bold text-gray-700">
            <Lock size={15} className="shrink-0" />
            <span>This room is locked by the administrator.</span>
          </div>
        )}

        {!isMine && !elig.eligible && (
          <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-800">
            <Ban size={15} className="shrink-0" />
            <span>{elig.reason}</span>
          </div>
        )}

        {/* Roommates list (only for caller's own room — privacy guaranteed) */}
        {isMine && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-emerald-700" />
                Roommates ({room.occupant_count}/{room.capacity})
              </span>
            </div>
            {loadingOcc ? (
              <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
                <Loader2 size={14} className="animate-spin" />
                <span>Loading roommates...</span>
              </div>
            ) : occupants.length === 0 ? (
              <p className="text-xs text-gray-500">You are currently the only occupant.</p>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {occupants.map((occ) => (
                  <div
                    key={occ.userId}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-gray-100"
                  >
                    <div>
                      <p className="font-bold text-emerald-950">{occ.fullName}</p>
                      <p className="text-[10px] text-gray-500">{occ.rollNo || occ.role}</p>
                    </div>
                    {occ.userId === me?.profile?.id && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        You
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Footer */}
        <div className="pt-1 space-y-2">
          {isMine ? (
            banner.isOpen && !isLocked ? (
              confirmRelease ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 space-y-2.5">
                  <p className="text-xs font-bold text-red-900">
                    Release Room {room.room_no}? Another student can claim your bed immediately.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmRelease(false)}
                      disabled={busy}
                      className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-700"
                    >
                      Keep Room
                    </button>
                    <button
                      type="button"
                      onClick={() => onRelease?.(room)}
                      disabled={busy}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      {busy && <Loader2 size={14} className="animate-spin" />}
                      <span>Confirm Release</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRelease(true)}
                  disabled={busy}
                  className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-3 text-xs font-extrabold text-red-700 hover:bg-red-100 transition"
                >
                  <LogOut size={15} />
                  <span>Release Room</span>
                </button>
              )
            ) : null
          ) : myRoom ? (
            <button
              type="button"
              onClick={() => onSwitch?.(myRoom, room)}
              disabled={!canAct || isFull || busy}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-3 text-xs font-extrabold text-white shadow-md hover:bg-emerald-800 disabled:opacity-45 disabled:cursor-not-allowed transition"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRightLeft size={15} />}
              <span>
                {isFull
                  ? 'Room Full'
                  : `Switch from Room ${myRoom.room_no} to Room ${room.room_no}`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelect?.(room)}
              disabled={!canAct || isFull || busy}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-3 text-xs font-extrabold text-white shadow-md hover:bg-emerald-800 disabled:opacity-45 disabled:cursor-not-allowed transition"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              <span>{isFull ? 'Room Full' : `Confirm & Select Room ${room.room_no}`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentRoomSheet(props) {
  if (!props.room || !props.stay) return null;
  const isMine = Boolean(props.myRoom && props.room.id === props.myRoom.id);
  return <StudentRoomSheetBody key={`${props.room.id}-${props.room.version}-${isMine}`} {...props} />;
}
