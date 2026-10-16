"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { internalDocuments } from "@/lib/db/tables/internal-documents";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { deleteFileByUrl } from "@/lib/upload";
import { type ActionResult } from "@/lib/action-result";
import { getInternalDocument } from "@/server/queries/internal-docs";
import {
  canDeleteInternalDoc,
  canUseInternalDocs,
  internalDocsPath,
  isWordFile,
  urlFileName,
  wordOpenUri,
} from "@/lib/internal-docs/logic";
import { createWordToken } from "@/lib/internal-docs/word-token";

/** Hujjatni oʻchiradi: yuklagan xodim yoki rahbariyat (direktor, oʻrinbosar, HR). */
export async function removeInternalDocument(id: string): Promise<ActionResult> {
  const me = await requireUser();
  if (!canUseInternalDocs(me.position)) return { ok: false, error: "forbidden" };
  const doc = await getInternalDocument(id);
  if (!doc) return { ok: false, error: "not_found" };
  if (!canDeleteInternalDoc(me, doc.uploadedByUserId)) return { ok: false, error: "forbidden" };

  await db.delete(internalDocuments).where(eq(internalDocuments.id, id));
  await deleteFileByUrl(doc.fileUrl);
  await logActivity({
    userId: me.id,
    action: "internal_doc.deleted",
    entityType: "internal_document",
    entityId: id,
    oldValue: { kind: doc.kind, title: doc.title, fileName: doc.fileName },
  });
  revalidatePath(internalDocsPath(doc.kind));
  return { ok: true };
}

/** Joriy soʻrovning tashqi manzili (proksi orqasida ham): Word faylni shu manzildan yuklaydi. */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  if (host) {
    const fwd = h.get("x-forwarded-proto")?.split(",")[0].trim();
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
    return `${fwd || (local ? "http" : "https")}://${host}`;
  }
  return (process.env.APP_URL ?? "").replace(/\/+$/, "");
}

/**
 * "Wordda ochish": Office URI (ms-word:ofv|u|…) qaytaradi. Word faylni kukisiz yuklagani uchun
 * manzil qisqa muddatli, faqat shu hujjatga bogʻlangan imzolangan token bilan beriladi.
 */
export async function getInternalDocWordLink(id: string): Promise<ActionResult<{ url: string }>> {
  const me = await requireUser();
  if (!canUseInternalDocs(me.position)) return { ok: false, error: "forbidden" };
  const doc = await getInternalDocument(id);
  if (!doc) return { ok: false, error: "not_found" };
  if (!isWordFile(doc.fileName)) return { ok: false, error: "invalid" };
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return { ok: false, error: "invalid" };

  const origin = await requestOrigin();
  if (!origin) return { ok: false, error: "invalid" };
  const token = createWordToken(doc.id, secret);
  const fileUrl = `${origin}/api/internal-docs/${doc.id}/word/${token}/${urlFileName(doc.fileName)}`;
  return { ok: true, url: wordOpenUri(fileUrl) };
}
