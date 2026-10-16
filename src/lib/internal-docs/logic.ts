// "Ichki hujjatlar" moduli uchun sof mantiq (DB yoʻq, server-only yoʻq) — sahifa, API va
// mijoz komponentlari bir xil qoidalardan foydalanadi va unit-testlar bilan tekshiriladi.

import type { InternalDocKind } from "@/lib/db/tables/internal-documents";

/** URL segmenti ↔ hujjat turi. */
export const KIND_SLUGS: Record<InternalDocKind, string> = {
  bildirgi: "bildirgilar",
  buyruq: "buyruqlar",
};

export function kindFromSlug(slug: string | null | undefined): InternalDocKind | null {
  const s = (slug ?? "").toLowerCase();
  if (s === "bildirgilar") return "bildirgi";
  if (s === "buyruqlar") return "buyruq";
  return null;
}

export function isInternalDocKind(v: unknown): v is InternalDocKind {
  return v === "bildirgi" || v === "buyruq";
}

export function internalDocsPath(kind: InternalDocKind): string {
  return `/ichki-hujjatlar/${KIND_SLUGS[kind]}`;
}

/** Word ochadigan fayl turlari va ularning MIME turi. */
const WORD_MIME: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  rtf: "application/rtf",
};

function ext(fileName: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return m ? m[1].toLowerCase() : "";
}

/** Fayl Microsoft Word'da ochiladimi (docx, doc, rtf). */
export function isWordFile(fileName: string | null | undefined): boolean {
  return !!fileName && ext(fileName) in WORD_MIME;
}

export function wordMimeType(fileName: string): string {
  return WORD_MIME[ext(fileName)] ?? "application/octet-stream";
}

/**
 * Office URI sxemasi: Word'ni oʻqish rejimida ochadi va hujjatni ushbu HTTPS manzildan
 * oʻzi yuklab oladi (kompyuterda ham, telefondagi Word ilovasida ham ishlaydi).
 * https://learn.microsoft.com/office/client-developer/office-uri-schemes
 */
export function wordOpenUri(absoluteFileUrl: string): string {
  return `ms-word:ofv|u|${absoluteFileUrl}`;
}

/** URL yoʻlining oxirgi segmenti uchun xavfsiz fayl nomi (Word oynasi sarlavhasida koʻrinadi). */
export function urlFileName(fileName: string): string {
  const cleaned = fileName.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
  return encodeURIComponent(cleaned || "hujjat.docx");
}

/**
 * Yuklab olish uchun Content-Disposition: ASCII zaxira nomi + RFC 5987 boʻyicha asl
 * (kirill/lotin, maxsus belgili) nom — brauzer faylni aynan asl nomi bilan saqlaydi.
 */
export function contentDisposition(type: "attachment" | "inline", fileName: string): string {
  const name = fileName.replace(/[\r\n"]+/g, " ").trim() || "hujjat";
  const ascii = name.replace(/[^\x20-\x7e]+/g, "_").replace(/\\/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** Hujjat nomi berilmasa, fayl nomidan (kengaytmasiz) olinadi. */
export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^./\\]+$/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return (base || fileName).slice(0, 300);
}

/** YYYY-MM-DD formatidagi haqiqiy sana. */
export function isYmd(v: string | null | undefined): v is string {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** YYYY-MM-DD → DD.MM.YYYY (hujjat sanasi uchun). */
export function ymdToDots(v: string | null | undefined): string {
  if (!isYmd(v)) return "";
  const [y, m, d] = v.split("-");
  return `${d}.${m}.${y}`;
}

const MANAGER_POSITIONS = new Set(["direktor", "orinbosar", "hr"]);

/** Ichki hujjatlar boʻlimidan foydalanish: barcha ichki xodimlar, kontragent (studiya) — hech qachon. */
export function canUseInternalDocs(position: string | null | undefined): boolean {
  return !!position && position !== "kontragent";
}

/** Oʻchirish: hujjatni yuklagan xodim yoki rahbariyat (direktor, oʻrinbosar, HR). */
export function canDeleteInternalDoc(
  viewer: { id: string; position: string },
  uploadedByUserId: string | null | undefined,
): boolean {
  if (!canUseInternalDocs(viewer.position)) return false;
  return MANAGER_POSITIONS.has(viewer.position) || (!!uploadedByUserId && uploadedByUserId === viewer.id);
}

/** Roʻyxatdagi qidiruv: nom, raqam, fayl nomi va yuklagan xodim boʻyicha (registrga befarq). */
export function matchesQuery(
  doc: { title: string; docNumber: string | null; fileName: string; uploaderName: string | null },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [doc.title, doc.docNumber ?? "", doc.fileName, doc.uploaderName ?? ""].some((s) => s.toLowerCase().includes(q));
}
