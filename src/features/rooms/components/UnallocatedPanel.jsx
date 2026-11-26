import { useEffect, useState, useCallback } from 'react';
import { Search, UserCheck, Users, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { roomsApi } from '../api/roomsApi';

export default function UnallocatedPanel({
  stayId,
  rooms = [],
  isAdmin = false,
  refreshTrigger = 0,
  onAssigned,
}) {
  const [data, setData] = useState({
    totalEligible: 0,
    allocatedCount: 0,
    unallocatedCount: 0,
    users: [],
  });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [gender, setGender] = useState('');
  const [assignRoomByUser, setAssignRoomByUser] = useState({});
  const [busyUserId, setBusyUserId] = useState(null);

  const loadUnallocated = useCallback(async () => {
    if (!stayId) return;
    try {
      const res = await roomsApi.getUnallocated(stayId, { role, gender, q });
      setData(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load unallocated list.');
    } finally {
      setLoading(false);
    }
  }, [stayId, role, gender, q]);

  useEffect(() => {
    if (!stayId) return;
    let cancelled = false;
    roomsApi
      .getUnallocated(stayId, { role, gender, q })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message || 'Failed to load unallocated list.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stayId, role, gender, q, refreshTrigger]);

  const handleQuickAssign = async (user) => {
    const roomId = assignRoomByUser[user.id];
    if (!roomId) return;
    try {
      setBusyUserId(user.id);
      await roomsApi.adminAssign({ userId: user.id, roomId });
      toast.success(`Assigned ${user.fullName}.`);
      await loadUnallocated();
      onAssigned?.();
    } catch (err) {
      toast.error(err.message || 'Assignment failed.');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress Counter */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <Users size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-emerald-950">
              {data.allocatedCount} / {data.totalEligible} allocated
            </p>
            <p className="text-xs text-gray-500">
              {data.unallocatedCount} matching unallocated person(s)
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, roll no..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs"
          />
        </div>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold"
        >
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="coordinator">Coordinators</option>
          <option value="admin">Admins</option>
        </select>

        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold"
        >
          <option value="">All genders</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
          <option value="unset">Gender unset</option>
        </select>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-gray-100">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading unallocated people...</span>
          </div>
        ) : data.users.length === 0 ? (
          <div className="p-8 text-center space-y-1">
            <UserCheck size={28} className="mx-auto text-emerald-600" />
            <p className="text-sm font-bold text-gray-800">Everyone matching is allocated!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.users.map((u) => (
              <div
                key={u.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 text-xs hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-extrabold text-emerald-950">{u.fullName}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-700">
                      {u.role}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                        u.gender
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {u.gender || 'Gender unset'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    {u.rollNo ? `${u.rollNo} • ` : ''}
                    {u.email}
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={assignRoomByUser[u.id] || ''}
                      onChange={(e) =>
                        setAssignRoomByUser((prev) => ({ ...prev, [u.id]: e.target.value }))
                      }
                      className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs"
                    >
                      <option value="">Pick room...</option>
                      {rooms
                        .filter((r) => r.occupant_count < r.capacity)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.room_no} ({r.type_label} {r.occupant_count}/{r.capacity})
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={!assignRoomByUser[u.id] || busyUserId === u.id}
                      onClick={() => handleQuickAssign(u)}
                      className="rounded-xl bg-emerald-800 px-3 py-1.5 font-bold text-white hover:bg-emerald-900 disabled:opacity-50"
                    >
                      {busyUserId === u.id ? '...' : 'Assign'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
