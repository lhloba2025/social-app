// imageConvert.js — normalize uploaded images so the browser can render them.
//
// iPhone photos are HEIC/HEIF, which Chrome/Edge/Firefox cannot display.
// This converts HEIC/HEIF files to JPEG client-side before upload so the
// design canvas always shows a real image instead of a broken-image icon.

/** True when the file looks like an Apple HEIC/HEIF image. */
export function isHeic(file) {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

/**
 * Shrinks an image blob so it fits under `maxBytes` for upload.
 * Caps the longest side to `maxDimension`, then for transparent PNGs
 * progressively downscales; opaque images fall back to JPEG.
 * Returns a Blob (possibly the original if already small enough).
 */
export async function shrinkBlobToLimit(blob, { maxBytes = 9.5 * 1024 * 1024, maxDimension = 2600 } = {}) {
  if (!blob) return blob;

  const isPng = (blob.type || "").includes("png");
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("image decode failed"));
      im.src = url;
    });

    let W = img.naturalWidth || img.width;
    let H = img.naturalHeight || img.height;
    const longest = Math.max(W, H);
    const overSized = longest > maxDimension;

    // Already small and within dimensions — keep as-is
    if (!overSized && blob.size <= maxBytes) return blob;

    if (overSized) {
      const r = maxDimension / longest;
      W = Math.round(W * r);
      H = Math.round(H * r);
    }

    const draw = (w, h) => {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const cx = c.getContext("2d");
      cx.imageSmoothingEnabled = true;
      cx.imageSmoothingQuality = "high";
      cx.drawImage(img, 0, 0, w, h);
      return c;
    };
    const toBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));

    let canvas = draw(W, H);
    // Transparent PNGs must stay PNG; downscale until under the limit
    if (isPng) {
      let out = await toBlob(canvas, "image/png");
      let scale = 1;
      while (out && out.size > maxBytes && scale > 0.25) {
        scale *= 0.8;
        canvas = draw(Math.max(1, Math.round(W * scale)), Math.max(1, Math.round(H * scale)));
        out = await toBlob(canvas, "image/png");
      }
      return out || blob;
    }
    // Opaque — JPEG. Start higher (0.96) and step down slowly so quality is
    // preserved for templates, calligraphy backdrops, etc.
    let q = 0.96;
    let out = await toBlob(canvas, "image/jpeg", q);
    while (out && out.size > maxBytes && q > 0.6) {
      q -= 0.05;
      out = await toBlob(canvas, "image/jpeg", q);
    }
    return out || blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Returns a browser-displayable File.
 * - HEIC/HEIF  → converted to JPEG
 * - everything else → returned untouched
 * Throws on conversion failure so callers can show a clear message.
 */
export async function normalizeImageFile(file) {
  if (!file || !isHeic(file)) return file;

  // Lazy-load heic2any — it is ~1.5MB and only needed for HEIC uploads.
  const heic2any = (await import("heic2any")).default;

  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });

  // heic2any may return a single Blob or an array of Blobs (multi-image HEIC).
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const newName = (file.name || "image").replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
