import { useState } from 'react';
import { X, Plus, Palette, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { roomsApi } from '../api/roomsApi';

const ROLES = ['student', 'coordinator', 'admin'];
const GENDERS = ['female', 'male', 'other'];

function RoomTypesEditor({ stay, roomTypes, onClose, onSaved }) {
  const [items, setItems] = useState(() =>
    roomTypes.map((rt) => ({
      id: rt.id,
      key: rt.key,
      label: rt.label,
      colorHex: rt.color_hex,
      allowedRoles: rt.allowed_roles || ['student'],
      allowedGenders: rt.allowed_genders || [],
    }))
  );
  const [saving, setSaving] = useState(false);

  const addCustomType = () => {
    const idx = items.length + 1;
    setItems((prev) => [
      ...prev,
      {
        key: `custom_${idx}`,
        label: `Custom ${idx}`,
        colorHex: '#8B5CF6',
        allowedRoles: ['student', 'coordinator'],
        allowedGenders: [],
      },
    ]);
  };

  const toggleArr = (idx, field, val) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const cur = item[field] || [];
        const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
        return { ...item, [field]: next };
      })
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await roomsApi.upsertRoomTypes(
        stay.id,
        items.map((item) => ({
          id: item.id,
          key: item.key.trim().toLowerCase().replace(/\s+/g, '_'),
          label: item.label.trim(),
          colorHex: item.colorHex,
          allowedRoles: item.allowedRoles.length ? item.allowedRoles : ['student'],
          allowedGenders: item.allowedGenders.length ? item.allowedGenders : null,
        }))
      );
      toast.success('Room types saved.');
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Failed to save room types.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 backdrop-blur-xs p-3 sm:p-4">
      <form
        onSubmit={handleSave}
        className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Palette size={19} className="text-emerald-700" />
            <div>
              <h3 className="text-lg font-black text-emerald-950">Room Types & Colours</h3>
              <p className="text-xs text-gray-500">
                Customize default types or add custom categories (VIP, Family, Mixed).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id || item.key + idx}
              className="rounded-2xl border border-gray-200 p-3.5 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    required
                    value={item.label}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x))
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Slug Key
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(item.id)}
                    value={item.key}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, key: e.target.value } : x))
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-mono disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Colour
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={item.colorHex}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, colorHex: e.target.value } : x))
                        )
                      }
                      className="h-8 w-12 cursor-pointer rounded border border-gray-200"
                    />
                    <span className="font-mono text-xs text-gray-600">{item.colorHex}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500">Roles:</span>
                  {ROLES.map((r) => (
                    <label key={r} className="inline-flex items-center gap-1 capitalize cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.allowedRoles.includes(r)}
                        onChange={() => toggleArr(idx, 'allowedRoles', r)}
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500">
                    Genders (empty = any):
                  </span>
                  {GENDERS.map((g) => (
                    <label key={g} className="inline-flex items-center gap-1 capitalize cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.allowedGenders.includes(g)}
                        onChange={() => toggleArr(idx, 'allowedGenders', g)}
                      />
                      <span>{g}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={addCustomType}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            <Plus size={14} /> Add Custom Type
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save Types</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function RoomTypesModal({ isOpen, stay, roomTypes = [], onClose, onSaved }) {
  if (!isOpen || !stay) return null;
  const editorKey = `${stay.id}-${roomTypes.map((t) => t.id).join(',')}`;
  return (
    <RoomTypesEditor
      key={editorKey}
      stay={stay}
      roomTypes={roomTypes}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
