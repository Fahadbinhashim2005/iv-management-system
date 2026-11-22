import { useMemo, useState } from "react";
import { createAvatar } from "@dicebear/core";
import * as collection from "@dicebear/collection";

/**
 * ==============================================================================
 * Universal Avatar Component
 * ==============================================================================
 * Renders an avatar according to the 3-state system:
 * 1. 'upload' -> Renders the uploaded WebP photo from Supabase Storage.
 * 2. 'preset' -> Generates a modern SVG avatar in-browser via DiceBear.
 * 3. 'initial' -> Standard colored tile with the user's first initial.
 *
 * Always falls back gracefully to the initial letter if an image fails to load.
 */

// Available styles mapped to DiceBear collections
export const AVATAR_STYLES = {
  lorelei: { name: "Lorelei (Modern & Friendly)", collection: collection.lorelei },
  adventurer: { name: "Adventurer (Playful Characters)", collection: collection.adventurer },
  bottts: { name: "Bottts (Tech Robots)", collection: collection.bottts },
  funEmoji: { name: "Fun Emoji (Expressive)", collection: collection.funEmoji },
};

const sizeClasses = {
  xs: "w-7 h-7 text-xs rounded-lg",
  sm: "w-9 h-9 text-sm rounded-xl",
  md: "w-12 h-12 text-base rounded-2xl",
  lg: "w-16 h-16 text-xl rounded-2xl",
  xl: "w-24 h-24 text-3xl rounded-3xl",
};

export default function Avatar({ profile, size = "md", className = "", animate = false }) {
  const [imgError, setImgError] = useState(false);

  const avatarType = profile?.avatar_type || "initial";
  const avatarUrl = profile?.avatar_url;
  const avatarStyle = profile?.avatar_style || "lorelei";
  const avatarSeed = profile?.avatar_seed || profile?.id || profile?.email || "student";
  const initialLetter = (profile?.full_name || profile?.name || profile?.email || "S")
    .trim()[0]
    .toUpperCase();

  // Generate DiceBear SVG data URI in-memory
  const dicebearUri = useMemo(() => {
    if (avatarType !== "preset") return null;
    try {
      const selectedStyle = AVATAR_STYLES[avatarStyle]?.collection || collection.lorelei;
      const avatar = createAvatar(selectedStyle, {
        seed: avatarSeed,
        size: 128,
      });
      return avatar.toDataUri();
    } catch (err) {
      console.warn("[Avatar] DiceBear generation error:", err);
      return null;
    }
  }, [avatarType, avatarStyle, avatarSeed]);

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const animationClass = animate ? "transition-transform hover:scale-105 active:scale-95 duration-200" : "";

  // 1. Uploaded Photo State
  if (avatarType === "upload" && avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={profile?.full_name || "Profile Photo"}
        onError={() => setImgError(true)}
        className={`object-cover shadow-sm ring-2 ring-emerald-500/20 ${sizeClass} ${animationClass} ${className}`}
      />
    );
  }

  // 2. DiceBear Animated Preset State
  if (avatarType === "preset" && dicebearUri && !imgError) {
    return (
      <img
        src={dicebearUri}
        alt="Avatar Preset"
        onError={() => setImgError(true)}
        className={`bg-emerald-50/80 p-0.5 object-contain shadow-sm ring-2 ring-emerald-500/20 ${sizeClass} ${animationClass} ${className}`}
      />
    );
  }

  // 3. Fallback Initial Letter State (Default)
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700 font-extrabold text-white shadow-sm ring-2 ring-emerald-600/20 select-none ${sizeClass} ${animationClass} ${className}`}
      aria-label={profile?.full_name || "Avatar"}
    >
      {initialLetter}
    </div>
  );
}
