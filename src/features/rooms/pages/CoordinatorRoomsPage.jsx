import { useEffect, useState } from 'react';
import { BedDouble, LayoutGrid, Table2, Users, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { roomsApi } from '../api/roomsApi';
import { useRoomGrid } from '../hooks/useRoomGrid';
import { checkClientEligibility, getWindowBannerState } from '../utils/eligibility';
import RoomGridBoard from '../components/RoomGridBoard';
import RoomsTableView from '../components/RoomsTableView';
import UnallocatedPanel from '../components/UnallocatedPanel';
import StaffRoomModal from '../components/StaffRoomModal';

export default function CoordinatorRoomsPage() {
  const [stays, setStays] = useState([]);
  const [staysLoading, setStaysLoading] = useState(true);
  const [selectedStayId, setSelectedStayId] = useState('');
  const [viewTab, setViewTab] = useState('grid'); // 'grid' | 'table' | 'unallocated'
  const [activeRoom, setActiveRoom] = useState(null);
  const [pendingRoomId, setPendingRoomId] = useState(null);

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
        if (!cancelled) toast.error(err.message || 'Failed to load stays.');
      })
      .finally(() => {
        if (!cancelled) setStaysLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { grid, me, loading, connectionState, refresh } = useRoomGrid(selectedStayId);

  const handleSelfSelect = async (room) => {
    try {
      setPendingRoomId(room.id);
      await roomsApi.selectRoom(selectedStayId, room.id);
      toast.success(`Selected Room ${room.room_no}`);
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Selection failed.');
    } finally {
      setPendingRoomId(null);
    }
  };

  const handleSelfRelease = async (room) => {
    if (!window.confirm(`Release Room ${room.room_no}?`)) return;
    try {
      setPendingRoomId(room.id);
      await roomsApi.deselectRoom(selectedStayId, room.id);
      toast.success(`Released Room ${room.room_no}`);
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Release failed.');
    } finally {
      setPendingRoomId(null);
    }
  };

  const handleSelfSwitch = async (fromRoom, toRoom) => {
    try {
      setPendingRoomId(toRoom.id);
      await roomsApi.switchRoom(selectedStayId, fromRoom.id, toRoom.id);
      toast.success(`Switched to Room ${toRoom.room_no}`);
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Switch failed.');
    } finally {
      setPendingRoomId(null);
    }
  };

  const latestActiveRoom =
    activeRoom && grid?.rooms
      ? grid.rooms.find((r) => r.id === activeRoom.id) || activeRoom
      : null;

  const canSelfSelectActiveRoom =
    latestActiveRoom &&
    getWindowBannerState(grid?.stay).isOpen &&
    !latestActiveRoom.is_locked &&
    checkClientEligibility(me?.profile, latestActiveRoom, grid?.stay).eligible;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Hospitality &amp; Lodging
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-950 sm:text-3xl">
            Accommodation &amp; Room Roster
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Inspect occupants across all rooms, view unallocated participants, and select your own staff room.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stays.length > 0 && (
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

      {/* Tabs */}
      {stays.length > 0 && (
        <div className="flex items-center gap-1.5 border-b border-gray-200 pb-2">
          {[
            { id: 'grid', label: 'Room Grid', icon: LayoutGrid },
            { id: 'table', label: 'Table View', icon: Table2 },
            { id: 'unallocated', label: 'Unallocated', icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setViewTab(id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                viewTab === id
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-emerald-50'
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {staysLoading || loading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl bg-white p-12 text-xs font-bold text-gray-500 shadow-xs ring-1 ring-gray-100">
          <Loader2 size={18} className="animate-spin text-emerald-700" />
          <span>Loading stay details...</span>
        </div>
      ) : stays.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-xs ring-1 ring-gray-100 space-y-2">
          <BedDouble size={36} className="mx-auto text-gray-400" />
          <h3 className="text-base font-extrabold text-gray-800">No hotel stays created yet</h3>
          <p className="text-xs text-gray-500">Ask an administrator to create a stay and generate rooms.</p>
        </div>
      ) : viewTab === 'grid' ? (
        <RoomGridBoard
          grid={grid}
          me={me}
          isStaffMode={true}
          connectionState={connectionState}
          pendingRoomId={pendingRoomId}
          onTileClick={(room) => setActiveRoom(room)}
          onMyRoomClick={(room) => setActiveRoom(room)}
        />
      ) : viewTab === 'table' ? (
        <RoomsTableView
          rooms={grid?.rooms || []}
          isAdmin={false}
          onSelectRoom={(room) => setActiveRoom(room)}
        />
      ) : (
        <UnallocatedPanel stayId={selectedStayId} rooms={grid?.rooms || []} isAdmin={false} />
      )}

      <StaffRoomModal
        room={latestActiveRoom}
        stay={grid?.stay}
        roomTypes={grid?.roomTypes || []}
        allRooms={grid?.rooms || []}
        isAdmin={false}
        myRoom={me?.myRoom}
        onClose={() => setActiveRoom(null)}
        onMutated={() => refresh({ silent: true })}
        onSelfSelect={canSelfSelectActiveRoom && !me?.myRoom ? handleSelfSelect : undefined}
        onSelfRelease={
          latestActiveRoom &&
          me?.myRoom?.id === latestActiveRoom.id &&
          getWindowBannerState(grid?.stay).isOpen &&
          !latestActiveRoom.is_locked
            ? handleSelfRelease
            : undefined
        }
        onSelfSwitch={canSelfSelectActiveRoom && me?.myRoom ? handleSelfSwitch : undefined}
      />
    </div>
  );
}
