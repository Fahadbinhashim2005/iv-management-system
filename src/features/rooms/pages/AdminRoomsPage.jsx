import { useEffect, useState, useCallback } from 'react';
import {
  BedDouble,
  Plus,
  Sparkles,
  Palette,
  LayoutGrid,
  Table2,
  Users,
  Download,
  RefreshCw,
  CheckSquare,
  Loader2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { roomsApi } from '../api/roomsApi';
import { useRoomGrid } from '../hooks/useRoomGrid';
import RoomGridBoard from '../components/RoomGridBoard';
import RoomsTableView from '../components/RoomsTableView';
import UnallocatedPanel from '../components/UnallocatedPanel';
import StaffRoomModal from '../components/StaffRoomModal';
import LayoutGeneratorModal from '../components/LayoutGeneratorModal';
import RoomTypesModal from '../components/RoomTypesModal';

export default function AdminRoomsPage() {
  const [stays, setStays] = useState([]);
  const [staysLoading, setStaysLoading] = useState(true);
  const [selectedStayId, setSelectedStayId] = useState('');
  const [headcounts, setHeadcounts] = useState(null);
  const [viewTab, setViewTab] = useState('grid'); // 'grid' | 'table' | 'unallocated'
  const [refreshTick, setRefreshTick] = useState(0);

  // Modals
  const [activeRoom, setActiveRoom] = useState(null);
  const [showNewStay, setShowNewStay] = useState(false);
  const [newStayName, setNewStayName] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);
  const [showRoomTypes, setShowRoomTypes] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [singleRoomForm, setSingleRoomForm] = useState({
    roomNo: '',
    floor: '',
    capacity: 3,
    roomTypeId: '',
  });

  // Bulk edit mode
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [bulkForm, setBulkForm] = useState({ roomTypeId: '', capacity: '', isLocked: '' });
  const [busy, setBusy] = useState(false);

  const loadStays = useCallback(async () => {
    setStaysLoading(true);
    try {
      const list = await roomsApi.listStays();
      setStays(list || []);
      if (list && list.length > 0) {
        setSelectedStayId((prev) =>
          prev && list.some((s) => s.id === prev) ? prev : list[0].id
        );
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load stays.');
    } finally {
      setStaysLoading(false);
    }
  }, []);

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

  useEffect(() => {
    if (!selectedStayId) return;
    let cancelled = false;
    roomsApi
      .getStay(selectedStayId)
      .then((info) => {
        if (!cancelled) setHeadcounts(info?.headcounts || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedStayId]);

  const stay = grid?.stay;
  const roomTypes = grid?.roomTypes || [];
  const rooms = grid?.rooms || [];

  const handleCreateStay = async (e) => {
    e.preventDefault();
    if (!newStayName.trim()) return;
    try {
      setBusy(true);
      const created = await roomsApi.createStay({ name: newStayName.trim() });
      toast.success(`Created stay "${created.name}"`);
      setNewStayName('');
      setShowNewStay(false);
      await loadStays();
      setSelectedStayId(created.id);
    } catch (err) {
      toast.error(err.message || 'Failed to create stay.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateStay = async (patch, successMsg) => {
    if (!stay) return;
    try {
      setBusy(true);
      await roomsApi.updateStay(stay.id, patch);
      toast.success(successMsg);
      await Promise.all([refresh({ silent: true }), loadStays()]);
    } catch (err) {
      toast.error(err.message || 'Failed to update stay.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateSingleRoom = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      await roomsApi.createRoom(stay.id, {
        roomNo: singleRoomForm.roomNo,
        floor: singleRoomForm.floor || null,
        capacity: Number(singleRoomForm.capacity),
        roomTypeId: singleRoomForm.roomTypeId || roomTypes[0]?.id,
      });
      toast.success(`Added Room ${singleRoomForm.roomNo}`);
      setSingleRoomForm({ roomNo: '', floor: '', capacity: 3, roomTypeId: '' });
      setShowAddRoom(false);
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Failed to add room.');
    } finally {
      setBusy(false);
    }
  };

  const toggleBulkRoom = (room) => {
    setSelectedRoomIds((prev) =>
      prev.includes(room.id) ? prev.filter((id) => id !== room.id) : [...prev, room.id]
    );
  };

  const handleApplyBulk = async () => {
    if (selectedRoomIds.length === 0) return;
    const payload = { roomIds: selectedRoomIds };
    if (bulkForm.roomTypeId) payload.roomTypeId = bulkForm.roomTypeId;
    if (bulkForm.capacity) payload.capacity = Number(bulkForm.capacity);
    if (bulkForm.isLocked !== '') payload.isLocked = bulkForm.isLocked === 'true';

    if (Object.keys(payload).length <= 1) {
      toast.error('Choose at least one bulk change to apply.');
      return;
    }

    try {
      setBusy(true);
      const res = await roomsApi.bulkUpdateRooms(stay.id, payload);
      if (res.failedCount > 0) {
        toast.error(
          `Updated ${res.updatedCount}, ${res.failedCount} skipped: ${res.failed[0]?.message}`
        );
      } else {
        toast.success(`Updated ${res.updatedCount} room(s).`);
      }
      setSelectedRoomIds([]);
      setBulkMode(false);
      setBulkForm({ roomTypeId: '', capacity: '', isLocked: '' });
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Bulk update failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleReconcile = async () => {
    if (!stay) return;
    try {
      setBusy(true);
      const res = await roomsApi.reconcileCounts(stay.id);
      toast.success(`Checked ${res.checked} rooms, fixed ${res.fixed} drift(s).`);
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Reconcile failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleExportCsv = async () => {
    if (!stay) return;
    try {
      await roomsApi.downloadCsv(stay.id, stay.name);
      toast.success('Exported room allocation CSV.');
    } catch (err) {
      toast.error(err.message || 'Export failed.');
    }
  };

  const handleSelfSelect = async (room) => {
    try {
      setBusy(true);
      await roomsApi.selectRoom(stay.id, room.id);
      toast.success(`Selected Room ${room.room_no}`);
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Selection failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSelfRelease = async (room) => {
    if (!window.confirm(`Release Room ${room.room_no}?`)) return;
    try {
      setBusy(true);
      await roomsApi.deselectRoom(stay.id, room.id);
      toast.success(`Released Room ${room.room_no}`);
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Release failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSelfSwitch = async (fromRoom, toRoom) => {
    try {
      setBusy(true);
      await roomsApi.switchRoom(stay.id, fromRoom.id, toRoom.id);
      toast.success(`Switched to Room ${toRoom.room_no}`);
      await refresh({ silent: true });
    } catch (err) {
      toast.error(err.message || 'Switch failed.');
    } finally {
      setBusy(false);
    }
  };

  const latestActiveRoom =
    activeRoom && rooms ? rooms.find((r) => r.id === activeRoom.id) || activeRoom : null;

  const totalBeds = rooms.reduce((s, r) => s + (Number(r.capacity) || 0), 0);
  const occupiedBeds = rooms.reduce((s, r) => s + (Number(r.occupant_count) || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Admin Room Control
          </p>
          <h1 className="mt-1 text-2xl font-black text-emerald-950 sm:text-3xl">
            Room Allocation &amp; Layouts
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Build hotel layouts, manage room types, open selection windows, and handle overrides.
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
                  {s.name} ({s.selection_status})
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setShowNewStay(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-900"
          >
            <Plus size={14} /> New Stay
          </button>
        </div>
      </div>

      {staysLoading || loading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl bg-white p-12 text-xs font-bold text-gray-500 shadow-xs ring-1 ring-gray-100">
          <Loader2 size={18} className="animate-spin text-emerald-700" />
          <span>Loading room management...</span>
        </div>
      ) : stays.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-xs ring-1 ring-gray-100 space-y-3">
          <BedDouble size={40} className="mx-auto text-emerald-700 opacity-70" />
          <h3 className="text-lg font-black text-emerald-950">Create Your First Stay</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Each hotel or city stop gets its own stay with Girls, Boys, Staff, or custom room types.
          </p>
          <button
            type="button"
            onClick={() => setShowNewStay(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white"
          >
            <Plus size={15} /> Create Stay (e.g. Udaipur Hotel)
          </button>
        </div>
      ) : (
        <>
          {/* Stay Window & Rules Card */}
          {stay && (
            <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-xs ring-1 ring-gray-100 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-black text-emerald-950">{stay.name}</h2>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                    {rooms.length} rooms • {occupiedBeds}/{totalBeds} beds filled
                  </span>
                </div>

                {/* Window Status Switcher */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-gray-500 mr-1">Window:</span>
                  {['draft', 'open', 'closed'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handleUpdateStay(
                          { selectionStatus: status },
                          `Window set to ${status.toUpperCase()}`
                        )
                      }
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition ${
                        stay.selection_status === status
                          ? status === 'open'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : status === 'closed'
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-amber-500 text-white shadow-xs'
                          : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 text-xs">
                <label className="inline-flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(stay.coordinator_can_use_gender_rooms)}
                    onChange={(e) =>
                      handleUpdateStay(
                        { coordinatorCanUseGenderRooms: e.target.checked },
                        'Updated coordinator gender-room setting.'
                      )
                    }
                  />
                  <span>Allow coordinators to self-select girls/boys rooms</span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGenerator(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 py-2 font-bold text-white hover:bg-emerald-900"
                  >
                    <Sparkles size={14} /> Generate Layout
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRoom(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <Plus size={14} /> Add Room
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRoomTypes(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <Palette size={14} /> Types &amp; Colours
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkMode((v) => !v);
                      setSelectedRoomIds([]);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 font-bold ${
                      bulkMode
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <CheckSquare size={14} /> {bulkMode ? 'Exit Bulk Select' : 'Bulk Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={handleReconcile}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 font-bold text-gray-700 hover:bg-gray-50"
                    title="Recompute occupant_count from room_occupants"
                  >
                    <RefreshCw size={13} /> Reconcile
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <Download size={14} /> CSV
                  </button>
                </div>
              </div>

              {/* Bulk Edit Toolbar */}
              {bulkMode && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
                  <span className="font-black text-emerald-950">
                    {selectedRoomIds.length} selected
                  </span>
                  <select
                    value={bulkForm.roomTypeId}
                    onChange={(e) => setBulkForm((p) => ({ ...p, roomTypeId: e.target.value }))}
                    className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 font-bold"
                  >
                    <option value="">Keep type</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        Set type: {rt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    placeholder="Capacity"
                    value={bulkForm.capacity}
                    onChange={(e) => setBulkForm((p) => ({ ...p, capacity: e.target.value }))}
                    className="w-24 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 font-bold"
                  />
                  <select
                    value={bulkForm.isLocked}
                    onChange={(e) => setBulkForm((p) => ({ ...p, isLocked: e.target.value }))}
                    className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 font-bold"
                  >
                    <option value="">Keep lock state</option>
                    <option value="true">Lock selected</option>
                    <option value="false">Unlock selected</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyBulk}
                    disabled={selectedRoomIds.length === 0 || busy}
                    className="rounded-xl bg-emerald-800 px-3.5 py-1.5 font-bold text-white disabled:opacity-50"
                  >
                    Apply to {selectedRoomIds.length}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRoomIds(rooms.map((r) => r.id))}
                    className="ml-auto font-bold text-emerald-800 underline"
                  >
                    Select all
                  </button>
                </div>
              )}
            </div>
          )}

          {/* View Tabs */}
          <div className="flex items-center gap-1.5 border-b border-gray-200 pb-2">
            {[
              { id: 'grid', label: 'Room Grid', icon: LayoutGrid },
              { id: 'table', label: 'Table View', icon: Table2 },
              { id: 'unallocated', label: 'Unallocated List', icon: Users },
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

          {viewTab === 'grid' ? (
            <RoomGridBoard
              grid={grid}
              me={me}
              isStaffMode={true}
              connectionState={connectionState}
              bulkSelectMode={bulkMode}
              selectedRoomIds={selectedRoomIds}
              onTileClick={(room) => (bulkMode ? toggleBulkRoom(room) : setActiveRoom(room))}
              onMyRoomClick={(room) => setActiveRoom(room)}
            />
          ) : viewTab === 'table' ? (
            <RoomsTableView
              rooms={rooms}
              isAdmin={true}
              onSelectRoom={(room) => setActiveRoom(room)}
              onExportCsv={handleExportCsv}
            />
          ) : (
            <UnallocatedPanel
              stayId={selectedStayId}
              rooms={rooms}
              isAdmin={true}
              refreshTrigger={refreshTick}
              onAssigned={() => {
                refresh({ silent: true });
                setRefreshTick((t) => t + 1);
              }}
            />
          )}
        </>
      )}

      {/* Room Details / Admin Override Modal */}
      <StaffRoomModal
        room={latestActiveRoom}
        stay={stay}
        roomTypes={roomTypes}
        allRooms={rooms}
        isAdmin={true}
        myRoom={me?.myRoom}
        onClose={() => setActiveRoom(null)}
        onMutated={() => {
          refresh({ silent: true });
          setRefreshTick((t) => t + 1);
        }}
        onSelfSelect={!me?.myRoom ? handleSelfSelect : undefined}
        onSelfRelease={
          latestActiveRoom && me?.myRoom?.id === latestActiveRoom.id
            ? handleSelfRelease
            : undefined
        }
        onSelfSwitch={me?.myRoom ? handleSelfSwitch : undefined}
      />

      {/* Layout Generator Modal */}
      <LayoutGeneratorModal
        isOpen={showGenerator}
        stay={stay}
        roomTypes={roomTypes}
        existingRooms={rooms}
        headcounts={headcounts}
        onClose={() => setShowGenerator(false)}
        onSaved={() => {
          refresh({ silent: true });
          loadStays();
        }}
      />

      {/* Room Types Modal */}
      <RoomTypesModal
        isOpen={showRoomTypes}
        stay={stay}
        roomTypes={roomTypes}
        onClose={() => setShowRoomTypes(false)}
        onSaved={() => refresh({ silent: true })}
      />

      {/* New Stay Modal */}
      {showNewStay && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateStay}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-black text-emerald-950">New Hotel / Lodging Stay</h3>
              <button
                type="button"
                onClick={() => setShowNewStay(false)}
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Stay Name *</label>
              <input
                type="text"
                required
                value={newStayName}
                onChange={(e) => setNewStayName(e.target.value)}
                placeholder="e.g. Udaipur Hotel"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs font-semibold"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Girls (#EC4899), Boys (#3B82F6), and Staff (#F59E0B) room types are seeded automatically.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewStay(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-emerald-800 px-5 py-2 text-xs font-bold text-white"
              >
                Create Stay
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Single Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateSingleRoom}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-black text-emerald-950">Add Single Room</h3>
              <button
                type="button"
                onClick={() => setShowAddRoom(false)}
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Room No *</label>
                <input
                  type="text"
                  required
                  value={singleRoomForm.roomNo}
                  onChange={(e) => setSingleRoomForm((p) => ({ ...p, roomNo: e.target.value }))}
                  placeholder="101"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Floor</label>
                <input
                  type="text"
                  value={singleRoomForm.floor}
                  onChange={(e) => setSingleRoomForm((p) => ({ ...p, floor: e.target.value }))}
                  placeholder="1st Floor"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Capacity *</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={singleRoomForm.capacity}
                  onChange={(e) =>
                    setSingleRoomForm((p) => ({ ...p, capacity: Number(e.target.value) }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Type *</label>
                <select
                  value={singleRoomForm.roomTypeId || roomTypes[0]?.id || ''}
                  onChange={(e) =>
                    setSingleRoomForm((p) => ({ ...p, roomTypeId: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 font-bold"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRoom(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-emerald-800 px-5 py-2 text-xs font-bold text-white"
              >
                Add Room
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
