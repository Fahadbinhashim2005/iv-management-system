import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Eye, Save, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { roomsApi } from '../api/roomsApi';
import { expandLayoutRows, hexToRgba } from '../utils/eligibility';

export default function LayoutGeneratorModal({
  isOpen,
  stay,
  roomTypes = [],
  existingRooms = [],
  headcounts = null,
  onClose,
  onSaved,
}) {
  const defaultTypeId = roomTypes[0]?.id || '';
  const [rows, setRows] = useState([
    {
      id: 1,
      floor: '1st Floor',
      prefix: '',
      startNo: 101,
      endNo: 106,
      exclude: '13',
      capacity: 3,
      roomTypeId: defaultTypeId,
    },
  ]);

  const [mode, setMode] = useState('add'); // 'add' | 'replace'
  const [previewRooms, setPreviewRooms] = useState(null); // null until Preview clicked
  const [editingRoom, setEditingRoom] = useState(null);
  const [saving, setSaving] = useState(false);

  const typeMap = useMemo(
    () => new Map(roomTypes.map((rt) => [rt.id, rt])),
    [roomTypes]
  );

  // Total existing occupants across stay
  const existingOccupantCount = useMemo(
    () => existingRooms.reduce((sum, r) => sum + (Number(r.occupant_count) || 0), 0),
    [existingRooms]
  );

  // Summary strip: existing (if mode=add) + previewRooms (or generated)
  const summary = useMemo(() => {
    const activePreview = previewRooms || expandLayoutRows(rows);
    const baseRooms =
      mode === 'replace'
        ? []
        : existingRooms.map((r) => ({
            capacity: r.capacity,
            roomTypeId: r.room_type_id,
          }));
    const combined = [...baseRooms, ...activePreview];

    const bedsByTypeKey = { girls: 0, boys: 0, staff: 0 };
    for (const r of combined) {
      const rt = typeMap.get(r.roomTypeId || r.room_type_id);
      if (rt) {
        bedsByTypeKey[rt.key] = (bedsByTypeKey[rt.key] || 0) + (Number(r.capacity) || 0);
      }
    }

    const totalRooms = combined.length;
    const totalBeds = combined.reduce((s, r) => s + (Number(r.capacity) || 0), 0);

    const warnings = [];
    if (headcounts) {
      if ((bedsByTypeKey.girls || 0) < headcounts.studentsFemale) {
        warnings.push(
          `Girls beds (${bedsByTypeKey.girls || 0}) < female students (${headcounts.studentsFemale})`
        );
      }
      if ((bedsByTypeKey.boys || 0) < headcounts.studentsMale) {
        warnings.push(
          `Boys beds (${bedsByTypeKey.boys || 0}) < male students (${headcounts.studentsMale})`
        );
      }
      if ((bedsByTypeKey.staff || 0) < headcounts.coordinatorsTotal) {
        warnings.push(
          `Staff beds (${bedsByTypeKey.staff || 0}) < coordinators (${headcounts.coordinatorsTotal})`
        );
      }
    }

    return {
      newCount: activePreview.length,
      totalRooms,
      totalBeds,
      bedsByTypeKey,
      warnings,
    };
  }, [previewRooms, rows, mode, existingRooms, typeMap, headcounts]);

  if (!isOpen || !stay) return null;

  const addRow = () => {
    const last = rows[rows.length - 1];
    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        floor: last ? last.floor : '2nd Floor',
        prefix: last?.prefix || '',
        startNo: last ? Number(last.endNo) + 1 : 201,
        endNo: last ? Number(last.endNo) + 5 : 205,
        exclude: '',
        capacity: last?.capacity || 3,
        roomTypeId: last?.roomTypeId || roomTypes[0]?.id || '',
      },
    ]);
    setPreviewRooms(null);
  };

  const removeRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setPreviewRooms(null);
  };

  const updateRow = (id, key, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: value } : r))
    );
    setPreviewRooms(null);
  };

  const handlePreview = () => {
    const expanded = expandLayoutRows(rows);
    if (expanded.length === 0) {
      toast.error('No rooms generated. Check start/end numbers.');
      return;
    }
    setPreviewRooms(expanded);
  };

  const handleSave = async () => {
    const roomsToSave = previewRooms || expandLayoutRows(rows);
    if (roomsToSave.length === 0) {
      toast.error('Nothing to save. Add valid room ranges.');
      return;
    }
    if (mode === 'replace' && existingOccupantCount > 0) {
      toast.error(
        `Cannot replace layout while ${existingOccupantCount} occupant(s) hold rooms.`
      );
      return;
    }

    try {
      setSaving(true);
      const res = await roomsApi.generateLayout(stay.id, {
        mode,
        rooms: roomsToSave.map((r) => ({
          roomNo: r.roomNo,
          floor: r.floor,
          capacity: Number(r.capacity),
          roomTypeId: r.roomTypeId,
        })),
      });
      toast.success(`Saved ${res.inserted} room(s) to ${stay.name}!`);
      setPreviewRooms(null);
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Failed to generate layout.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="w-full max-w-4xl max-h-[92dvh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              {stay.name}
            </p>
            <h3 className="text-xl font-black text-emerald-950 flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" />
              Rooms → Generate Layout
            </h3>
            <p className="text-xs text-gray-500">
              Define floor ranges, preview the colour-coded grid, tweak individual rooms, then save atomically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Summary Strip & Sanity Warnings */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-gray-800">
            <span>Total Rooms: {summary.totalRooms}</span>
            <span>•</span>
            <span>Total Beds: {summary.totalBeds}</span>
            {roomTypes.map((rt) => (
              <span
                key={rt.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 ring-1 ring-gray-200"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rt.color_hex }} />
                {rt.label}: {summary.bedsByTypeKey[rt.key] || 0} beds
              </span>
            ))}
          </div>

          {headcounts && (
            <p className="text-[11px] text-gray-600">
              Active headcount: <strong>{headcounts.studentsFemale}</strong> female students ·{' '}
              <strong>{headcounts.studentsMale}</strong> male students ·{' '}
              <strong>{headcounts.coordinatorsTotal}</strong> coordinators
              {headcounts.studentsOtherOrUnset > 0 && (
                <span> · {headcounts.studentsOtherOrUnset} other/unset gender</span>
              )}
            </p>
          )}

          {summary.warnings.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs font-bold text-amber-900">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                {summary.warnings.map((w, idx) => (
                  <p key={idx}>{w}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Repeatable Generator Rows */}
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div
              key={row.id}
              className="grid grid-cols-2 sm:grid-cols-7 gap-2 rounded-2xl border border-gray-200 bg-white p-3 items-end"
            >
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Floor / Block
                </label>
                <input
                  type="text"
                  value={row.floor}
                  onChange={(e) => updateRow(row.id, 'floor', e.target.value)}
                  placeholder="1st Floor"
                  className="w-full rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Prefix
                </label>
                <input
                  type="text"
                  value={row.prefix}
                  onChange={(e) => updateRow(row.id, 'prefix', e.target.value)}
                  placeholder="e.g. A-"
                  className="w-full rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Start #
                </label>
                <input
                  type="number"
                  value={row.startNo}
                  onChange={(e) => updateRow(row.id, 'startNo', Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  End #
                </label>
                <input
                  type="number"
                  value={row.endNo}
                  onChange={(e) => updateRow(row.id, 'endNo', Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Exclude
                </label>
                <input
                  type="text"
                  value={row.exclude}
                  onChange={(e) => updateRow(row.id, 'exclude', e.target.value)}
                  placeholder="13, 113"
                  className="w-full rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  Beds / Room
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={row.capacity}
                  onChange={(e) => updateRow(row.id, 'capacity', Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs font-bold"
                />
              </div>

              <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Type
                  </label>
                  <select
                    value={row.roomTypeId || roomTypes[0]?.id || ''}
                    onChange={(e) => updateRow(row.id, 'roomTypeId', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-xs font-bold"
                  >
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    aria-label={`Remove row ${idx + 1}`}
                    className="mt-4 rounded-xl border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              <Plus size={14} /> Add Range Row
            </button>

            <button
              type="button"
              onClick={handlePreview}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
            >
              <Eye size={14} /> Preview Grid ({summary.newCount} rooms)
            </button>
          </div>
        </div>

        {/* Interactive Preview Grid */}
        {previewRooms && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                Preview ({previewRooms.length} rooms — tap any tile to edit capacity/type)
              </h4>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {previewRooms.map((r) => {
                const rt = typeMap.get(r.roomTypeId);
                const color = rt?.color_hex || '#3B82F6';
                return (
                  <button
                    key={r.tempId}
                    type="button"
                    onClick={() => setEditingRoom(r)}
                    style={{
                      backgroundColor: hexToRgba(color, 0.14),
                      borderColor: color,
                    }}
                    className="rounded-xl border p-2 text-left hover:shadow-sm transition"
                  >
                    <p className="text-xs font-black text-gray-900 truncate">{r.roomNo}</p>
                    <p className="text-[10px] font-bold truncate" style={{ color }}>
                      {rt?.label || 'Type'}
                    </p>
                    <p className="text-[10px] font-bold text-gray-600">{r.capacity} beds</p>
                  </button>
                );
              })}
            </div>

            {editingRoom && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 border border-gray-200 text-xs">
                <span className="font-black text-emerald-950">Editing {editingRoom.roomNo}:</span>
                <select
                  value={editingRoom.roomTypeId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPreviewRooms((prev) =>
                      prev.map((x) =>
                        x.tempId === editingRoom.tempId ? { ...x, roomTypeId: val } : x
                      )
                    );
                    setEditingRoom((p) => ({ ...p, roomTypeId: val }));
                  }}
                  className="rounded-lg border border-gray-200 px-2 py-1 font-bold"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editingRoom.capacity}
                  onChange={(e) => {
                    const val = Math.min(20, Math.max(1, Number(e.target.value) || 1));
                    setPreviewRooms((prev) =>
                      prev.map((x) =>
                        x.tempId === editingRoom.tempId ? { ...x, capacity: val } : x
                      )
                    );
                    setEditingRoom((p) => ({ ...p, capacity: val }));
                  }}
                  className="w-16 rounded-lg border border-gray-200 px-2 py-1 font-bold"
                />
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="ml-auto rounded-lg bg-emerald-800 px-3 py-1 font-bold text-white"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mode & Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-3 text-xs">
            <label className="inline-flex items-center gap-1.5 font-bold text-gray-800 cursor-pointer">
              <input
                type="radio"
                name="layoutMode"
                checked={mode === 'add'}
                onChange={() => setMode('add')}
              />
              Add to existing
            </label>
            <label
              className={`inline-flex items-center gap-1.5 font-bold cursor-pointer ${
                existingOccupantCount > 0 ? 'text-gray-400' : 'text-red-700'
              }`}
            >
              <input
                type="radio"
                name="layoutMode"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
              />
              Replace layout
              {existingOccupantCount > 0 && ` (${existingOccupantCount} occupied)`}
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-900 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save Layout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
