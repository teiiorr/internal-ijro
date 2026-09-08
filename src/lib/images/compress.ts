/**
 * Brauzer tomonida işlaydigan rasm kiçraytirgiç.
 *
 * Katta rasmlar va skanlar (60MB'lik telefon surati, 4000-px'lik hujjat skani)
 * yuklamaning hajm çegarasidan oşib ketişiga eng köp sabab böladi. Ularni rad
 * etiş örniga, rasmni canvas'da maqbul maksimal ölçamda qayta çizib, JPEG
 * körinişida qayta kodlaymiz — bu odatda önlab MB'ni hujjat uçun közga
 * körinarli sifat yöqotişsiz ~1–3MB'ga aylantiradi. Tegib bölmaydigan yoki
 * tegmasligimiz kerak bölgan narsalar — PDF, Office fayllari, video, GIF, SVG,
 * brauzer dekodlay olmaydigan HEIC — özgarişsiz qaytariladi.
 *
 * Töliq brauzerda (canvas) işlaydi, şuning uçun katta fayl serverga yuklanib
 * bekorga rad etilmaydi va server unga CPU sarflamaydi.
 */

export type CompressResult = {
  /** Haqiqatda yuklanadigan fayl — foyda bölsa siqilgani, aks holda asli. */
  file: File;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
};

// <canvas> işonçli dekodlab va qayta kodlay oladigan raster formatlar. image/gif
// (animatsiyani yöqotardi) va image/svg+xml (vektor; yuklaş ham man etilgan) atayin çetlab ötildi.
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
  const targetBytes = opts.targetBytes ?? 3 * 1024 * 1024; // maqsad — ~3MB dan pastga tuşiş
  const maxDimension = opts.maxDimension ?? 2560; // eng uzun tomon

  // Faqat dekodlanadigan va rostdan ham kiçraytirişga arzigulik katta raster rasmlarni siqamiz.
  if (typeof document === "undefined") return passthrough(file);
  if (!COMPRESSIBLE.test(file.type)) return passthrough(file);
  if (file.size <= targetBytes) return passthrough(file);

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await loadImage(file);
  } catch {
    return passthrough(file); // dekodlab bölmadi (masalan HEIC) → borişiça yuklanadi
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
  // JPEG'da alfa yöq — şaffoflikni oq fonga tekislaymiz, aks holda qora bölib çiqadi.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);
  release(source);

  // Maqsadga tuşguncha (yoki 0.5 quyi çegarasiga yetguncha) sifatni bosqiçma-bosqiç kamaytiramiz.
  for (const quality of [0.82, 0.72, 0.6, 0.5]) {
    const blob = await toBlob(canvas, quality);
    if (!blob) break;
    const underTarget = blob.size <= targetBytes;
    if (underTarget || quality === 0.5) {
      // Qayta kodlaş uni aslida kiçraytirmagan bölsa (allaqaçon optimallaştirilgan JPEG), aslini qoldiramiz.
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
  // createImageBitmap eng tez va EXIF yönalişini hisobga oladi (telefon suratlari tik turadi).
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
