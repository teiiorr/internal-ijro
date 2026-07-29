/**
 * Client-side image shrinker.
 *
 * Big photos and scans (a 60MB phone shot, a 4000-px document scan) are the
 * common reason an upload blows past the size limit. Rather than reject them,
 * we re-render the image on a canvas at a sane maximum dimension and re-encode
 * it as JPEG, which typically turns tens of MB into ~1–3MB with no visible loss
 * for document use. Anything we can't or shouldn't touch — PDFs, Office files,
 * video, GIFs, SVGs, HEIC the browser can't decode — is returned unchanged.
 *
 * Runs entirely in the browser (canvas), so nothing large is uploaded only to
 * be rejected server-side, and the server never has to spend CPU on it.
 */

export type CompressResult = {
  /** The file to actually upload — compressed when it helped, else the original. */
  file: File;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
};

// Raster formats a <canvas> can reliably decode + re-encode. Deliberately excludes
// image/gif (would drop animation) and image/svg+xml (vector; also upload-forbidden).
const COMPRESSIBLE = /^image\/(jpe?g|png|webp|bmp)$/i;

const passthrough = (file: File): CompressResult => ({
  file,
  compressed: false,
  originalSize: file.size,
  finalSize: file.size,
});

export async function compressImage(
  file: File,
  opts: { targetBytes?: number; maxDimension?: number } = {}
): Promise<CompressResult> {
  const targetBytes = opts.targetBytes ?? 3 * 1024 * 1024; // aim to land under ~3MB
  const maxDimension = opts.maxDimension ?? 2560; // longest edge

  // Only shrink decodable raster images that are actually big enough to bother.
  if (typeof document === "undefined") return passthrough(file);
  if (!COMPRESSIBLE.test(file.type)) return passthrough(file);
  if (file.size <= targetBytes) return passthrough(file);

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await loadImage(file);
  } catch {
    return passthrough(file); // undecodable (e.g. HEIC) → upload as-is
  }

  const srcW = "width" in source ? source.width : 0;
  const srcH = "height" in source ? source.height : 0;
  if (!srcW || !srcH) {
    release(source);
    return passthrough(file);
  }

  const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    release(source);
    return passthrough(file);
  }
  // JPEG has no alpha — flatten any transparency onto white so it isn't rendered black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);
  release(source);

  // Walk quality down until we're under target (or hit the floor at 0.5).
  for (const quality of [0.82, 0.72, 0.6, 0.5]) {
    const blob = await toBlob(canvas, quality);
    if (!blob) break;
    const underTarget = blob.size <= targetBytes;
    if (underTarget || quality === 0.5) {
      // If re-encoding didn't actually shrink it (already-optimised JPEG), keep original.
      if (blob.size >= file.size) return passthrough(file);
      return {
        file: new File([blob], toJpgName(file.name), { type: "image/jpeg" }),
        compressed: true,
        originalSize: file.size,
        finalSize: blob.size,
      };
    }
  }
  return passthrough(file);
}

function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap is fastest and can honour EXIF orientation (upright phone photos).
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => loadViaTag(file));
  }
  return loadViaTag(file);
}

function loadViaTag(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode_failed"));
    };
    img.src = url;
  });
}

function release(source: ImageBitmap | HTMLImageElement) {
  if ("close" in source && typeof source.close === "function") source.close();
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function toJpgName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.jpg`;
}
