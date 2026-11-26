import { useState, useId, useCallback } from "react";
import Cropper from "react-easy-crop";
import { createAvatar } from "@dicebear/core";
import * as collection from "@dicebear/collection";
import { 
  X, 
  Upload, 
  Sparkles, 
  Shuffle, 
  Check, 
  Trash2, 
  Camera, 
  Loader2 
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import toast from "react-hot-toast";

const STYLES = [
  { id: "lorelei", label: "Lorelei", collection: collection.lorelei },
  { id: "adventurer", label: "Adventurer", collection: collection.adventurer },
  { id: "bottts", label: "Bottts (Robots)", collection: collection.bottts },
  { id: "funEmoji", label: "Fun Emoji", collection: collection.funEmoji },
];

function generateRandomSeeds(count = 12) {
  return Array.from({ length: count }, () => Math.random().toString(36).substring(2, 9));
}

// Client-side canvas crop & compress to WebP (<200KB, max 512x512)
async function getCroppedImg(imageSrc, pixelCrop) {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const targetSize = Math.min(512, Math.max(pixelCrop.width, pixelCrop.height));
  canvas.width = targetSize;
  canvas.height = targetSize;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetSize,
    targetSize
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/webp",
      0.85
    );
  });
}

export default function AvatarPicker({ isOpen, onClose, currentProfile, onSaveAvatar, userId }) {
  const fileInputId = useId();
  const [activeTab, setActiveTab] = useState(
    currentProfile?.avatar_type === "upload" ? "upload" : "preset"
  );

  // Preset Avatar State
  const [selectedStyle, setSelectedStyle] = useState(currentProfile?.avatar_style || "lorelei");
  const [seeds, setSeeds] = useState(() => generateRandomSeeds(12));
  const [selectedSeed, setSelectedSeed] = useState(
    currentProfile?.avatar_seed || seeds[0]
  );

  // Photo Upload & Cropping State
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploading, setUploading] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleShuffle = () => {
    const newSeeds = generateRandomSeeds(12);
    setSeeds(newSeeds);
    setSelectedSeed(newSeeds[0]);
  };

  // 1. Confirm Preset Avatar
  const handleConfirmPreset = async () => {
    await onSaveAvatar({
      avatar_type: "preset",
      avatar_style: selectedStyle,
      avatar_seed: selectedSeed,
      avatar_url: null,
    });
    onClose();
  };

  // 2. Select file for cropping
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Check max file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File exceeds 2MB limit. Please choose a smaller photo.");
        return;
      }

      // Check file type
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error("Invalid file format. Please upload a JPEG, PNG, or WebP image.");
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result);
      });
      reader.readAsDataURL(file);
    }
  };

  // 3. Upload Cropped Photo to Supabase Storage
  const handleUploadPhoto = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setUploading(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      if (isSupabaseConfigured && supabase && userId) {
        const filePath = `${userId}/avatar.webp`;

        // Upload to 'avatars' bucket with upsert (overwrites previous file)
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, croppedBlob, {
            contentType: "image/webp",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Retrieve public URL with cache-busting timestamp
        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        const finalUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

        await onSaveAvatar({
          avatar_type: "upload",
          avatar_url: finalUrl,
          avatar_style: selectedStyle,
          avatar_seed: selectedSeed,
        });

        setImageSrc(null);
        onClose();
      } else {
        // Local offline fallback
        const base64Url = URL.createObjectURL(croppedBlob);
        await onSaveAvatar({
          avatar_type: "upload",
          avatar_url: base64Url,
          avatar_style: selectedStyle,
          avatar_seed: selectedSeed,
        });
        setImageSrc(null);
        onClose();
      }
    } catch (err) {
      console.error("[Avatar Upload Error]:", err);
      toast.error(err.message || "Failed to upload photo. Storage bucket may not be configured.");
    } finally {
      setUploading(false);
    }
  };

  // 4. Reset to Initial Letter Avatar
  const handleResetToInitial = async () => {
    await onSaveAvatar({
      avatar_type: "initial",
      avatar_url: null,
      avatar_style: "lorelei",
      avatar_seed: userId || "initial",
    });
    toast.success("Reset to initial-letter avatar.", { id: "reset-avatar" });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        className="w-full sm:max-w-xl max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl ring-1 ring-gray-100 overflow-hidden pb-[env(safe-area-inset-bottom)]"
        role="dialog"
        aria-modal="true"
        aria-label="Choose profile picture"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-emerald-950">Choose Profile Picture</h3>
            <p className="text-xs text-gray-500">Pick an animated avatar or upload your own photo</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-100 px-6 bg-gray-50/50">
          <button
            type="button"
            onClick={() => setActiveTab("preset")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
              activeTab === "preset"
                ? "border-emerald-600 text-emerald-900"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Sparkles size={16} className={activeTab === "preset" ? "text-emerald-600" : ""} />
            <span>Choose Animated Avatar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition ${
              activeTab === "upload"
                ? "border-emerald-600 text-emerald-900"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Upload size={16} className={activeTab === "upload" ? "text-emerald-600" : ""} />
            <span>Upload Photo</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "preset" ? (
            <div className="space-y-5">
              {/* Style Selector */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {STYLES.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStyle(st.id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        selectedStyle === st.id
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleShuffle}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition active:scale-95"
                >
                  <Shuffle size={14} className="text-emerald-600" />
                  <span>Shuffle</span>
                </button>
              </div>

              {/* Avatar Grid (12 presets) */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {seeds.map((s) => {
                  const currCollection = STYLES.find((st) => st.id === selectedStyle)?.collection || collection.lorelei;
                  const dataUri = createAvatar(currCollection, { seed: s, size: 96 }).toDataUri();
                  const isSelected = selectedSeed === s;

                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSeed(s)}
                      className={`group relative flex items-center justify-center rounded-2xl bg-emerald-50/40 p-2 transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transform-none ${
                        isSelected
                          ? "ring-3 ring-emerald-600 shadow-md bg-emerald-50 scale-105"
                          : "ring-1 ring-gray-200 hover:ring-emerald-300"
                      }`}
                    >
                      <img src={dataUri} alt="Preset option" className="h-12 w-12 object-contain" />
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Confirm Selection Footer */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={handleResetToInitial}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 transition"
                >
                  <Trash2 size={14} />
                  <span>Use Initial Letter</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPreset}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                  >
                    Apply Avatar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {!imageSrc ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center hover:border-emerald-400 transition bg-emerald-50/20">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-inner mb-3">
                    <Camera size={26} />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-950">Select your photo</h4>
                  <p className="mt-1 text-xs text-gray-500 max-w-xs">
                    Choose from your gallery or take a picture with your camera (max 2MB, JPEG/PNG/WebP)
                  </p>

                  <label
                    htmlFor={fileInputId}
                    className="mt-4 cursor-pointer rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95"
                  >
                    Browse / Take Photo
                  </label>
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cropper area */}
                  <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-gray-900">
                    <Cropper
                      image={imageSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      showGrid={false}
                      onCropChange={setCrop}
                      onCropComplete={onCropComplete}
                      onZoomChange={setZoom}
                    />
                  </div>

                  {/* Zoom slider */}
                  <div className="flex items-center gap-3 px-2">
                    <span className="text-xs text-gray-500 font-semibold">Zoom</span>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setImageSrc(null)}
                      className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 transition"
                    >
                      Choose Different Photo
                    </button>

                    <button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={uploading}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-60"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Compressing & Uploading...</span>
                        </>
                      ) : (
                        <span>Save Profile Photo</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Remove Photo Action if user currently has one */}
              {currentProfile?.avatar_type === "upload" && !imageSrc && (
                <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Currently using custom photo</span>
                  <button
                    type="button"
                    onClick={handleResetToInitial}
                    className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 transition"
                  >
                    <Trash2 size={14} />
                    <span>Remove Photo</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
