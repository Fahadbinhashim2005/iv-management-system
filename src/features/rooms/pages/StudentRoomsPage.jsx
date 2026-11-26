import { useEffect, useState } from 'react';
import { BedDouble, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { roomsApi } from '../api/roomsApi';
import { useRoomGrid } from '../hooks/useRoomGrid';
import RoomGridBoard from '../components/RoomGridBoard';
import StudentRoomSheet from '../components/StudentRoomSheet';

export default function StudentRoomsPage() {
  const [stays, setStays] = useState([]);
  const [staysLoading, setStaysLoading] = useState(true);
  const [selectedStayId, setSelectedStayId] = useState('');
  const [activeRoom, setActiveRoom] = useState(null);
  const [pendingRoomId, setPendingRoomId] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    roomsApi
      .listStays()
      .then((list) => {
        if (cancelled) return;
        setStays(list || []);
        if (list && list.length > 0) {
          setSelectedStayId((prev) =>
            prev && list.some((s) => s.id === prev) ? prev : list[0].id
          );
        }
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message || 'Unable to load hotel stays.');
      })
      .finally(() => {
        if (!cancelled) setStaysLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { grid, me, loading, error, connectionState, refresh } = useRoomGrid(selectedStayId);

  const handleSelectRoom = async (room) => {
    if (!selectedStayId || actionBusy) return;
    try {
      setActionBusy(true);
      setPendingRoomId(room.id);
      await roomsApi.selectRoom(selectedStayId, room.id);
      toast.success(`Room ${room.room_no} selected!`);
      setActiveRoom(null);
      await refresh({ silent: true });
    } catch (err) {
      if (err.code === 'ROOM_FULL') {
        toast.error('Just taken, pick another.');
      } else {
        toast.error(err.message || 'Could not select room.');
      }
      await refresh({ silent: true });
    } finally {
      setActionBusy(false);
      setPendingRoomId(null);
    }
  };

  const handleReleaseRoom = async (room) => {
    if (!selectedStayId || actionBusy) return;
    try {
      setActionBusy(true);
      setPendingRoomId(room.id);
      await roomsApi.deselectRoom(selectedStayId, room.id);
      toast.success(`Released Room ${room.room_no}.`);
      setActiveRoom(null);
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Could not release room.');
      await refresh({ silent: true });
    } finally {
      setActionBusy(false);
      setPendingRoomId(null);
    }
  };

  const handleSwitchRoom = async (fromRoom, toRoom) => {
    if (!selectedStayId || actionBusy) return;
    try {
      setActionBusy(true);
      setPendingRoomId(toRoom.id);
      await roomsApi.switchRoom(selectedStayId, fromRoom.id, toRoom.id);
      toast.success(`Switched to Room ${toRoom.room_no}!`);
      setActiveRoom(null);
      await refresh({ silent: true });
    } catch (err) {
      if (err.code === 'ROOM_FULL') {
        toast.error('Just taken, pick another.');
      } else {
        toast.error(err.message || 'Could not switch rooms.');
      }
      await refresh({ silent: true });
    } finally {
      setActionBusy(false);
      setPendingRoomId(null);
    }
  };

  const latestActiveRoom =
    activeRoom && grid?.rooms
      ? grid.rooms.find((r) => r.id === activeRoom.id) || activeRoom
      : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Stay &amp; Room Allocation
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Hotel &amp; Room Selection
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Pick your room on the live grid. Your selection is saved instantly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stays.length > 1 && (
            <select
              value={selectedStayId}
              onChange={(e) => setSelectedStayId(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-emerald-950"
            >
              {stays.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {staysLoading || loading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl bg-white p-12 text-xs font-bold text-gray-500 shadow-xs ring-1 ring-gray-100">
          <Loader2 size={18} className="animate-spin text-emerald-700" />
          <span>Loading live room grid...</span>
        </div>
      ) : stays.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-xs ring-1 ring-gray-100 space-y-2">
          <BedDouble size={36} className="mx-auto text-gray-400" />
          <h3 className="text-base font-extrabold text-gray-800">No hotel stays configured yet</h3>
          <p className="text-xs text-gray-500">
            Room selection will appear here once the administrator creates the stay layout.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-xs ring-1 ring-red-100 space-y-3">
          <p className="text-sm font-bold text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white"
          >
            Retry
          </button>
        </div>
      ) : (
        <RoomGridBoard
          grid={grid}
          me={me}
          isStaffMode={false}
          connectionState={connectionState}
          pendingRoomId={pendingRoomId}
          onTileClick={(room) => setActiveRoom(room)}
          onMyRoomClick={(room) => setActiveRoom(room)}
        />
      )}

      <StudentRoomSheet
        room={latestActiveRoom}
        stay={grid?.stay}
        me={me}
        myRoom={me?.myRoom}
        busy={actionBusy}
        onClose={() => setActiveRoom(null)}
        onSelect={handleSelectRoom}
        onRelease={handleReleaseRoom}
        onSwitch={handleSwitchRoom}
      />
    </div>
  );
}
