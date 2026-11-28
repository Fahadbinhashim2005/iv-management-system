export const MAX_ORIGINAL_IMAGE_BYTES = 15 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"];
export const HERO_MAX_WIDTH = 1600;
export const THUMB_MAX_WIDTH = 480;
export const BLUR_WIDTH = 16;
export const WEBP_QUALITY = 0.8;

export function validateImageFile(file) {
  if (!file) return "No file selected.";
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Unsupported format. Please select a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    return "Image exceeds the 15 MB original file limit.";
  }
  return null;
}

export function computeTargetDimensions(srcWidth, srcHeight, maxWidth) {
  if (!srcWidth || !srcHeight || srcWidth <= 0 || srcHeight <= 0) {
    return { width: maxWidth, height: maxWidth };
  }
  if (srcWidth <= maxWidth) {
    return { width: srcWidth, height: srcHeight };
  }
  const ratio = maxWidth / srcWidth;
  return {
    width: maxWidth,
    height: Math.max(1, Math.round(srcHeight * ratio)),
  };
}

function renderToCanvas(bitmap, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

function canvasToWebpBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode WebP image."));
      },
      "image/webp",
      quality
    );
  });
}

/**
 * Validates, decodes, and compresses an image client-side into:
 * - heroBlob (<= 1600 px WebP)
 * - thumbBlob (<= 480 px WebP)
 * - blurDataUrl (16 px WebP data URI <= 1.5 KB)
 */
export async function processImageForUpload(file) {
  const err = validateImageFile(file);
  if (err) throw new Error(err);

  const bitmap = await createImageBitmap(file);
  try {
    const heroDims = computeTargetDimensions(bitmap.width, bitmap.height, HERO_MAX_WIDTH);
    const thumbDims = computeTargetDimensions(bitmap.width, bitmap.height, THUMB_MAX_WIDTH);
    const blurDims = computeTargetDimensions(bitmap.width, bitmap.height, BLUR_WIDTH);

    const heroCanvas = renderToCanvas(bitmap, heroDims.width, heroDims.height);
    const thumbCanvas = renderToCanvas(bitmap, thumbDims.width, thumbDims.height);
    const blurCanvas = renderToCanvas(bitmap, blurDims.width, blurDims.height);

    // Lower quality slightly if 1600px hero exceeds 250 KB
    let heroBlob = await canvasToWebpBlob(heroCanvas, WEBP_QUALITY);
    if (heroBlob.size > 250 * 1024) {
      heroBlob = await canvasToWebpBlob(heroCanvas, 0.7);
    }

    const thumbBlob = await canvasToWebpBlob(thumbCanvas, WEBP_QUALITY);
    const blurDataUrl = blurCanvas.toDataURL("image/webp", 0.5);

    return {
      heroBlob,
      thumbBlob,
      blurDataUrl,
      heroBytes: heroBlob.size,
      thumbBytes: thumbBlob.size,
      width: heroDims.width,
      height: heroDims.height,
    };
  } finally {
    bitmap.close?.();
  }
}
