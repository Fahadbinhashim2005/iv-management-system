import { Lock, Download } from 'lucide-react';

export default function RoomsTableView({
  rooms = [],
  isAdmin = false,
  onSelectRoom,
  onExportCsv,
}) {
  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-900"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Floor</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Occupancy</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No rooms created yet.
                  </td>
                </tr>
              ) : (
                rooms.map((room) => {
                  const full = room.occupant_count >= room.capacity;
                  return (
                    <tr key={room.id} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3 font-black text-emerald-950">
                        {room.room_no}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{room.floor || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-bold text-gray-800">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: room.color_hex }}
                          />
                          {room.type_label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {room.occupant_count}/{room.capacity}
                      </td>
                      <td className="px-4 py-3">
                        {room.is_locked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                            <Lock size={10} /> Locked
                          </span>
                        ) : full ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Full
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectRoom?.(room)}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
