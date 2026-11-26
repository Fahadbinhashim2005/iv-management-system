import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble,
  CheckCircle2,
  Clock,
  Lock,
  Ban,
  Wifi,
  WifiOff,
  AlertTriangle,
  Users,
  Search,
} from 'lucide-react';
import RoomTile from './RoomTile';
import { checkClientEligibility, getWindowBannerState } from '../utils/eligibility';

export default function RoomGridBoard({
  grid,
  me,
  isStaffMode = false,
  connectionState = 'live',
  pendingRoomId = null,
  bulkSelectMode = false,
  selectedRoomIds = [],
  onTileClick,
  onMyRoomClick,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'available' | 'my_type'
  const [search, setSearch] = useState('');

  const stay = grid?.stay;
  const roomTypes = useMemo(() => grid?.roomTypes || [], [grid?.roomTypes]);
  const rooms = useMemo(() => grid?.rooms || [], [grid?.rooms]);
  const profile = me?.profile;
  const myRoom = me?.myRoom || rooms.find((r) => r.is_mine) || null;
  const roommates = me?.roommates || [];

  const banner = useMemo(() => getWindowBannerState(stay), [stay]);

  const missingGenderWarning =
    !isStaffMode &&
    profile?.role === 'student' &&
    (!profile?.gender || !['male', 'female', 'other'].includes(profile.gender));

  const selectedSet = useMemo(() => new Set(selectedRoomIds), [selectedRoomIds]);

  const enrichedRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms
      .map((r) => {
        const elig = checkClientEligibility(profile, r, stay);
        return { ...r, _elig: elig };
      })
      .filter((r) => {
        if (q && !r.room_no.toLowerCase().includes(q) && !(r.floor || '').toLowerCase().includes(q)) {
          return false;
        }
        if (filter === 'available') {
          return !r.is_locked && r.occupant_count < r.capacity;
        }
        if (filter === 'my_type') {
          return r._elig.eligible || r.is_mine;
        }
        return true;
      });
  }, [rooms, profile, stay, filter, search]);

  // Group by floor preserving display order
  const floorGroups = useMemo(() => {
    const map = new Map();
    for (const r of enrichedRooms) {
      const label = r.floor && r.floor.trim() ? r.floor.trim() : 'Rooms';
      const list = map.get(label) || [];
      list.push(r);
      map.set(label, list);
    }
    return Array.from(map.entries());
  }, [enrichedRooms]);

  return (
    <div className="space-y-4">
      {/* Pinned "My room" bar at top (always visible when scrolling) */}
      {myRoom && (
        <div
          onClick={() => onMyRoomClick?.(myRoom)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onMyRoomClick?.(myRoom)}
          className="sticky top-16 lg:top-2 z-30 flex items-center justify-between gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-950 px-4 py-3 text-white shadow-lg cursor-pointer transition hover:bg-emerald-900"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-black shadow-inner"
              style={{ backgroundColor: myRoom.color_hex || '#10B981' }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                  Your Room
                </span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold">
                  {myRoom.occupant_count}/{myRoom.capacity} beds
                </span>
              </div>
              <p className="truncate text-sm font-black">
                Room {myRoom.room_no}
                {myRoom.floor ? ` • ${myRoom.floor}` : ''}
                {roommates.length > 1
                  ? ` • With ${roommates
                      .filter((rm) => rm.userId !== profile?.id)
                      .map((rm) => rm.fullName.split(' ')[0])
                      .join(', ')}`
                  : ''}
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-xl bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white">
            Manage
          </span>
        </div>
      )}

      {/* Window Status Banner + Connection Chip */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-bold flex-1 ${
            banner.tone === 'emerald'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : banner.tone === 'amber'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : banner.tone === 'red'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-gray-200 bg-gray-50 text-gray-700'
          }`}
        >
          <Clock size={15} className="shrink-0" />
          <span>{banner.label}</span>
        </div>

        <div
          className={`inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full px-3 py-1.5 text-[11px] font-bold border ${
            connectionState === 'live'
              ? 'border-emerald-200 bg-white text-emerald-700'
              : connectionState === 'reconnecting'
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-gray-200 bg-white text-gray-600'
          }`}
        >
          {connectionState === 'reconnecting' ? (
            <WifiOff size={13} className="animate-pulse" />
          ) : (
            <Wifi size={13} />
          )}
          <span>
            {connectionState === 'live'
              ? 'Live sync'
              : connectionState === 'reconnecting'
                ? 'Reconnecting…'
                : 'Auto-refresh'}
          </span>
        </div>
      </div>

      {/* Missing Gender Warning */}
      {missingGenderWarning && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-extrabold">Gender not set on your profile</p>
              <p className="text-amber-800">
                Set your gender in My Profile (or contact admin) before selecting a boys or girls room.
              </p>
            </div>
          </div>
          <Link
            to="/student/profile"
            className="self-start sm:self-center shrink-0 rounded-xl bg-amber-600 px-3.5 py-2 text-[11px] font-extrabold text-white hover:bg-amber-700 transition"
          >
            Update Profile
          </Link>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-xs ring-1 ring-gray-100 text-[11px] font-bold text-gray-700">
        {roomTypes.map((rt) => (
          <span
            key={rt.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: rt.color_hex }}
            />
            <span>{rt.label}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1 text-gray-500 ml-1">
          <Lock size={11} /> Locked
        </span>
        <span className="inline-flex items-center gap-1 text-gray-500">
          <Ban size={11} /> Ineligible
        </span>
        <span className="inline-flex items-center gap-1 text-gray-500">
          <Users size={11} /> Dim = Full
        </span>
      </div>

      {/* Filter Bar (sticky only on desktop so it never collides with mobile top header) */}
      <div className="lg:sticky lg:top-0 z-20 -mx-1 bg-[#F4F8F5]/95 px-1 py-2 backdrop-blur-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {[
            { id: 'all', label: `All (${rooms.length})` },
            {
              id: 'available',
              label: `Available (${rooms.filter((r) => !r.is_locked && r.occupant_count < r.capacity).length})`,
            },
            { id: 'my_type', label: 'My type' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`min-h-[38px] shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                filter === tab.id
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-emerald-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find room or floor..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-8 pr-3 text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Floor Groups & Grid */}
      {floorGroups.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-xs ring-1 ring-gray-100 space-y-2">
          <BedDouble size={32} className="mx-auto text-gray-400" />
          <p className="text-sm font-bold text-gray-700">No rooms match this filter</p>
          <p className="text-xs text-gray-500">Try switching back to &ldquo;All&rdquo; rooms.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {floorGroups.map(([floorName, floorRooms]) => (
            <section key={floorName} className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900">
                  {floorName}
                </h3>
                <span className="text-[11px] font-semibold text-gray-500">
                  {floorRooms.reduce((s, r) => s + r.occupant_count, 0)} /{' '}
                  {floorRooms.reduce((s, r) => s + r.capacity, 0)} beds filled
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {floorRooms.map((room) => (
                  <RoomTile
                    key={room.id}
                    room={room}
                    isMine={Boolean(room.is_mine)}
                    eligible={room._elig.eligible}
                    isStaffMode={isStaffMode}
                    isPending={pendingRoomId === room.id}
                    bulkSelectMode={bulkSelectMode}
                    isSelectedForBulk={selectedSet.has(room.id)}
                    onClick={onTileClick}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
