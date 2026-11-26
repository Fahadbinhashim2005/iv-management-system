import { useEffect, useState, useCallback } from 'react';
import {
  X,
  Lock,
  Unlock,
  Trash2,
  UserPlus,
  ArrowRightLeft,
  UserMinus,
  Loader2,
  Phone,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { roomsApi } from '../api/roomsApi';

function StaffRoomModalBody({
  room,
  stay,
  roomTypes = [],
  allRooms = [],
  isAdmin = false,
  myRoom = null,
  onClose,
  onMutated,
  onSelfSelect,
  onSelfRelease,
  onSelfSwitch,
}) {
  const [occupants, setOccupants] = useState([]);
  const [loadingOcc, setLoadingOcc] = useState(true);
  const [busy, setBusy] = useState(false);

  // Admin edit state
  const [editNo, setEditNo] = useState(room.room_no || '');
  const [editFloor, setEditFloor] = useState(room.floor || '');
  const [editCap, setEditCap] = useState(room.capacity || 3);
  const [editTypeId, setEditTypeId] = useState(room.room_type_id || '');

  // Admin assign state
  const [unallocated, setUnallocated] = useState([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [forceOverride, setForceOverride] = useState(false);

  // Move occupant target
  const [movingUserId, setMovingUserId] = useState(null);
  const [moveTargetRoomId, setMoveTargetRoomId] = useState('');

  const fetchOccupants = useCallback(async () => {
    try {
      const res = await roomsApi.getOccupants(stay.id, room.id);
      setOccupants(res?.occupants || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load occupants.');
    } finally {
      setLoadingOcc(false);
    }
  }, [room.id, stay.id]);

  const fetchUnallocated = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await roomsApi.getUnallocated(stay.id, { q: assignSearch });
      setUnallocated(res?.users || []);
    } catch {
      // Ignore transient search errors
    }
  }, [isAdmin, stay.id, assignSearch]);

  useEffect(() => {
    let cancelled = false;
    roomsApi
      .getOccupants(stay.id, room.id)
      .then((res) => {
        if (!cancelled) setOccupants(res?.occupants || []);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message || 'Failed to load occupants.');
      })
      .finally(() => {
        if (!cancelled) setLoadingOcc(false);
      });
    return () => {
      cancelled = true;
    };
  }, [room.id, room.version, stay.id]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    roomsApi
      .getUnallocated(stay.id, { q: assignSearch })
      .then((res) => {
        if (!cancelled) setUnallocated(res?.users || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin, stay.id, assignSearch]);

  const isMine = myRoom && myRoom.id === room.id;

  const handleSaveRoomEdit = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      await roomsApi.updateRoom(room.id, {
        roomNo: editNo,
        floor: editFloor,
        capacity: Number(editCap),
        roomTypeId: editTypeId,
      });
      toast.success(`Updated Room ${editNo}`);
      onMutated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to update room.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleLock = async () => {
    try {
      setBusy(true);
      await roomsApi.updateRoom(room.id, { isLocked: !room.is_locked });
      toast.success(room.is_locked ? `Unlocked Room ${room.room_no}` : `Locked Room ${room.room_no}`);
      onMutated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to toggle lock.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteRoom = async () => {
    const hasOcc = room.occupant_count > 0;
    const msg = hasOcc
      ? `Room ${room.room_no} has ${room.occupant_count} occupant(s). Force-delete and unassign them?`
      : `Delete Room ${room.room_no}?`;
    if (!window.confirm(msg)) return;

    try {
      setBusy(true);
      await roomsApi.deleteRoom(room.id, hasOcc);
      toast.success(`Deleted Room ${room.room_no}`);
      onMutated?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Failed to delete room.');
    } finally {
      setBusy(false);
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUserId) return;
    try {
      setBusy(true);
      await roomsApi.adminAssign({ userId: selectedUserId, roomId: room.id, force: forceOverride });
      toast.success('Assigned occupant to room.');
      setSelectedUserId('');
      await Promise.all([fetchOccupants(), fetchUnallocated()]);
      onMutated?.();
    } catch (err) {
      toast.error(err.message || 'Assignment failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveUser = async (userId, fullName) => {
    if (!window.confirm(`Remove ${fullName} from Room ${room.room_no}?`)) return;
    try {
      setBusy(true);
      await roomsApi.adminRemove({ userId, stayId: stay.id });
      toast.success(`Removed ${fullName}.`);
      await Promise.all([fetchOccupants(), fetchUnallocated()]);
      onMutated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to remove occupant.');
    } finally {
      setBusy(false);
    }
  };

  const handleMoveUser = async (userId) => {
    if (!moveTargetRoomId) return;
    try {
      setBusy(true);
      await roomsApi.adminMove({ userId, toRoomId: moveTargetRoomId, force: forceOverride });
      toast.success('Moved occupant.');
      setMovingUserId(null);
      setMoveTargetRoomId('');
      await fetchOccupants();
      onMutated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to move occupant.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-xl max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
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
                {room.is_locked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                    <Lock size={10} /> Locked
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-gray-500">
                {room.type_label} {room.floor ? `• ${room.floor}` : ''} • {room.occupant_count}/
                {room.capacity} occupied
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

        {/* Self-selection shortcut for coordinator / admin */}
        {(onSelfSelect || onSelfRelease || onSelfSwitch) && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-50/70 border border-emerald-100 px-3.5 py-2.5 text-xs">
            <span className="font-bold text-emerald-900">
              {isMine ? 'You are staying in this room' : 'Self-selection'}
            </span>
            {isMine && onSelfRelease ? (
              <button
                type="button"
                onClick={() => onSelfRelease(room)}
                disabled={busy}
                className="rounded-xl border border-red-200 bg-white px-3 py-1.5 font-bold text-red-700 hover:bg-red-50"
              >
                Release My Room
              </button>
            ) : myRoom && onSelfSwitch ? (
              <button
                type="button"
                onClick={() => onSelfSwitch(myRoom, room)}
                disabled={busy}
                className="rounded-xl bg-emerald-700 px-3 py-1.5 font-bold text-white hover:bg-emerald-800"
              >
                Switch Here
              </button>
            ) : onSelfSelect ? (
              <button
                type="button"
                onClick={() => onSelfSelect(room)}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 font-bold text-white hover:bg-emerald-800"
              >
                <CheckCircle2 size={13} /> Select for Myself
              </button>
            ) : null}
          </div>
        )}

        {/* Occupants List */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
            Occupants ({occupants.length}/{room.capacity})
          </h4>
          {loadingOcc ? (
            <div className="flex items-center gap-2 py-4 text-xs text-gray-500">
              <Loader2 size={15} className="animate-spin" />
              <span>Loading occupants...</span>
            </div>
          ) : occupants.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-4 text-center text-xs text-gray-500">
              No occupants assigned to this room yet.
            </div>
          ) : (
            <div className="space-y-2">
              {occupants.map((occ) => (
                <div
                  key={occ.userId}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-extrabold text-emerald-950 text-sm">
                          {occ.fullName}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-gray-700 ring-1 ring-gray-200">
                          {occ.role}
                        </span>
                        {occ.gender && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold capitalize text-blue-800">
                            {occ.gender}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            occ.isSelfSelected
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {occ.isSelfSelected ? 'Self-selected' : 'Admin-assigned'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                        {occ.rollNo && <span className="font-mono">{occ.rollNo}</span>}
                        {occ.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={11} /> {occ.phone}
                          </span>
                        )}
                        <span>
                          {new Date(occ.selectedAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setMovingUserId(movingUserId === occ.userId ? null : occ.userId)
                          }
                          title="Move occupant to another room"
                          className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-700 hover:bg-emerald-50"
                        >
                          <ArrowRightLeft size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(occ.userId, occ.fullName)}
                          disabled={busy}
                          title="Remove from room"
                          className="rounded-lg border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <UserMinus size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isAdmin && movingUserId === occ.userId && (
                    <div className="flex items-center gap-2 border-t border-gray-200 pt-2">
                      <select
                        value={moveTargetRoomId}
                        onChange={(e) => setMoveTargetRoomId(e.target.value)}
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs"
                      >
                        <option value="">Select target room...</option>
                        {allRooms
                          .filter((r) => r.id !== room.id)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              Room {r.room_no} ({r.type_label} • {r.occupant_count}/{r.capacity})
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleMoveUser(occ.userId)}
                        disabled={!moveTargetRoomId || busy}
                        className="rounded-xl bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Move
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="space-y-4 border-t border-gray-100 pt-4">
            {/* Assign Unallocated Person */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <UserPlus size={14} className="text-emerald-700" />
                  Assign Unallocated Person (Admin Override)
                </h4>
                <label className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceOverride}
                    onChange={(e) => setForceOverride(e.target.checked)}
                    className="rounded"
                  />
                  Force capacity
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="Search unallocated name..."
                  className="sm:w-44 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs"
                />
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs"
                >
                  <option value="">Choose person ({unallocated.length} unallocated)...</option>
                  {unallocated.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role}
                      {u.gender ? `, ${u.gender}` : ', gender unset'})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssignUser}
                  disabled={!selectedUserId || busy}
                  className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
              {forceOverride && (
                <p className="flex items-center gap-1 text-[10px] font-bold text-amber-800">
                  <ShieldAlert size={12} /> Force mode bypasses capacity limit (expands capacity and logs override).
                </p>
              )}
            </div>

            {/* Edit Room Details */}
            <form onSubmit={handleSaveRoomEdit} className="space-y-3 rounded-2xl border border-gray-200 p-3.5">
              <h4 className="text-xs font-black text-gray-800">Edit Room Settings</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Room No
                  </label>
                  <input
                    type="text"
                    required
                    value={editNo}
                    onChange={(e) => setEditNo(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Floor
                  </label>
                  <input
                    type="text"
                    value={editFloor}
                    onChange={(e) => setEditFloor(e.target.value)}
                    placeholder="e.g. 2nd"
                    className="w-full rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={editCap}
                    onChange={(e) => setEditCap(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Type
                  </label>
                  <select
                    value={editTypeId}
                    onChange={(e) => setEditTypeId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-xs font-bold"
                  >
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleLock}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
                  >
                    {room.is_locked ? <Unlock size={13} /> : <Lock size={13} />}
                    <span>{room.is_locked ? 'Unlock' : 'Lock'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteRoom}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StaffRoomModal(props) {
  if (!props.room || !props.stay) return null;
  return <StaffRoomModalBody key={`${props.room.id}-${props.room.version}`} {...props} />;
}
