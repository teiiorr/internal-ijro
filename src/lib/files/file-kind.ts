// Fayl turini nomidan aniqlaş (DB yöq, server-only yöq): röyxatdagi belgi va rang,
// brauzerda köriş mumkinmi va hajmni odamga tuşunarli yoziş. Mijoz ham, server ham işlatadi.

export type FileKind = "pdf" | "word" | "excel" | "slides" | "image" | "archive" | "video" | "audio" | "text" | "other";

const KIND_BY_EXT: Record<string, FileKind> = {
  pdf: "pdf",
  doc: "word", docx: "word", rtf: "word", odt: "word",
  xls: "excel", xlsx: "excel", csv: "excel", ods: "excel",
  ppt: "slides", pptx: "slides", odp: "slides", key: "slides",
  png: "image", jpg: "image", jpeg: "image", webp: "image", gif: "image", heic: "image", heif: "image", bmp: "image", tif: "image", tiff: "image",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
  mp4: "video", mov: "video", webm: "video", avi: "video", mkv: "video",
  mp3: "audio", wav: "audio", m4a: "audio", ogg: "audio", aac: "audio",
  txt: "text", md: "text",
};

/** Kengaytma (nuqtasiz, kiçik harfda) yoki böş satr. */
export function fileExt(fileName: string | null | undefined): string {
  const m = /\.([a-z0-9]+)$/i.exec((fileName ?? "").trim());
  return m ? m[1].toLowerCase() : "";
}

export function fileKind(fileName: string | null | undefined): FileKind {
  return KIND_BY_EXT[fileExt(fileName)] ?? "other";
}

/**
 * Brauzer özi xavfsiz körsata oladigan turlar va ularning aniq MIME turi: PDF va oddiy
 * rastr rasmlar. Qolganlari (Word, Excel, SVG, HTML va h.k.) faqat yuklab olinadi.
 */
const INLINE_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export function inlinePreviewMime(fileName: string | null | undefined): string | null {
  return INLINE_MIME[fileExt(fileName)] ?? null;
}

/** Röyxatda kiçik rasm (miniatyura) çizsa böladigan turlar: /api/files ?w= faqat şularni kiçraytiradi. */
export function hasThumbnail(fileName: string | null | undefined): boolean {
  return ["png", "jpg", "jpeg", "webp"].includes(fileExt(fileName));
}

/** Fayl turining qisqa yorliği meta-satr uçun: "PDF", "DOCX", "XLSX"... */
export function fileTypeLabel(fileName: string | null | undefined): string {
  return fileExt(fileName).toUpperCase();
}

/**
 * Yuklab bölmaydigan kengaytmalar: bajariladigan fayllar va brauzerda skript işga tuşira
 * oladigan markup (.html, .svg...). Server (lib/upload) va mijoz oldindan tekşiruvi bir röyxatdan.
 */
export const BLOCKED_UPLOAD_EXTS: readonly string[] = [
  "exe", "bat", "sh", "cmd", "com", "js", "mjs", "cjs", "jar", "msi",
  "vbs", "ps1", "scr", "app", "dll",
  "html", "htm", "xhtml", "svg", "svgz", "xml", "xsl", "mht", "mhtml",
];

export function isBlockedUpload(fileName: string | null | undefined): boolean {
  return BLOCKED_UPLOAD_EXTS.includes(fileExt(fileName));
}

export function humanSize(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
