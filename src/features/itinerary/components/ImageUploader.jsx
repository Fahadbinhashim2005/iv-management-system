import { useRef, useState } from "react";
import { Upload, Trash2, AlertTriangle, Loader2, Crosshair } from "lucide-react";
import toast from "react-hot-toast";
import { getMediaUrls, itineraryApi } from "../api/itineraryApi";

export default function ImageUploader({
  itineraryId,
  scope = "cover",
  valuePath = "",
  altValue = "",
  onAltChange = null,
  focalX = 50,
  focalY = 50,
  onFocalChange = null,
  enableFocalPicker = false,
  onUploaded,
  onRemoved,
  label = "Photo",
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastBytes, setLastBytes] = useState(null);

  const { heroUrl, thumbUrl } = getMediaUrls(valuePath);
  const previewUrl = heroUrl || thumbUrl;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !itineraryId) return;

    setUploading(true);
    setProgress(5);
    try {
      const res = await itineraryApi.uploadImage(file, {
        itineraryId,
        scope,
        existingPath: valuePath || null,
        onProgress: setProgress,
      });
      setLastBytes(res.heroBytes);
      onUploaded?.(res);
      toast.success(`Photo uploaded (${Math.round(res.heroBytes / 1024)} KB WebP).`);
    } catch (err) {
      toast.error(err?.message || "Failed to upload photo.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemove = async () => {
    if (!valuePath) return;
    try {
      await itineraryApi.removeImage(valuePath);
      setLastBytes(null);
      onRemoved?.();
      toast.success("Photo removed.");
    } catch (err) {
      toast.error(err?.message || "Could not remove photo.");
    }
  };

  const handlePreviewClick = (e) => {
    if (!enableFocalPicker || !onFocalChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    onFocalChange(x, y);
  };

  const sizeKb = lastBytes ? Math.round(lastBytes / 1024) : null;

  return (
    <div className="space-y-2.5 rounded-2xl border border-gray-200 bg-gray-50/60 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-gray-800">{label}</span>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/webp,image/jpeg,image/png"
            onChange={handleFileChange}
            className="sr-only"
          />
          <button
            type="button"
            disabled={uploading || !itineraryId}
            onClick={() => inputRef.current?.click()}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            <span>{valuePath ? "Replace" : "Upload Photo"}</span>
          </button>

          {valuePath && (
            <button
              type="button"
              disabled={uploading}
              onClick={handleRemove}
              aria-label="Remove photo"
              className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>Remove</span>
            </button>
          )}
        </div>
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] font-semibold text-gray-600">
            Compressing &amp; uploading WebP ({progress}%)...
          </p>
        </div>
      )}

      {sizeKb !== null && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          <span className="text-emerald-800">Compressed size: {sizeKb} KB</span>
          {lastBytes > 400 * 1024 && (
            <span className="inline-flex items-center gap-1 text-amber-800">
              <AlertTriangle size={12} /> Larger than 400 KB
            </span>
          )}
        </div>
      )}

      {previewUrl && (
        <div className="space-y-2">
          <div
            onClick={handlePreviewClick}
            className={`relative overflow-hidden rounded-xl border border-gray-200 bg-gray-900 ${
              enableFocalPicker ? "cursor-crosshair" : ""
            }`}
          >
            <img
              src={previewUrl}
              alt={altValue || label}
              className="max-h-48 w-full object-cover"
              style={{ objectPosition: `${focalX}% ${focalY}%` }}
            />
            {enableFocalPicker && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-600/80 p-1 text-white shadow"
                style={{ left: `${focalX}%`, top: `${focalY}%` }}
              >
                <Crosshair size={14} />
              </div>
            )}
          </div>
          {enableFocalPicker && (
            <p className="text-[11px] text-gray-600">
              Tap anywhere on the image to set focal point ({focalX}%, {focalY}%).
            </p>
          )}
        </div>
      )}

      {onAltChange && (
        <div>
          <label className="block text-[11px] font-bold text-gray-700">
            Image Alt Text (accessibility)
          </label>
          <input
            type="text"
            maxLength={160}
            value={altValue || ""}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder="Describe what is shown in the photo..."
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900"
          />
        </div>
      )}
    </div>
  );
}
