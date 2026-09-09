import "server-only";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { logActivity } from "@/lib/audit";
import { parseCsv, extractRows, normalizeName, type SheetRow } from "./sheet-parse";

/**
 * Google Sheets'dagi "Лойиҳа ҳолати" (joriy holat) ustunini ilovadagi
 * projects.currentStatus bilan sinxronlaydi. Manba — odam qölida yuritiladigan,
 * kirill alifbosidagi, bölimlarga ajratilgan hisobot varaği; şuning uçun tahlil
 * moslaşuvçan, moslaştiriş esa xavfsizlikka qaratilgan: FAQAT aniq bitta moslik
 * topilганda va matn ösgan bölsagina yoziladi. Heç qaçon öçirmaydi, heç qaçon
 * yangi loyiha yaratmaydi, boş qiymat bilan üstiga yozmaydi.
 */

// Standart CSV manzili — link orqali köriş oçiq varaq (autentifikatsiyasiz oçiladi).
// Kerak bölsa muhit özgaruvçisi bilan almaştiriladi.
// gid berilmasa Google birinçi (körinadigan) varaqni qaytaradi — bizga kerakli
// "ИШЛАБ ЧИҚАРИШГА ТУШИРИЛГАН ЛОЙИҲАЛАР" hisoboti öşa.
const DEFAULT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1RZ07hdvMhpZABGpuVPUSMt-8qGfYiAUnRRzj6jy2TXo/export?format=csv";

export function sheetCsvUrl(): string {
  return process.env.SHEET_STATUS_CSV_URL || DEFAULT_CSV_URL;
}

export type SyncResult = {
  ok: boolean;
  dryRun: boolean;
  fetched: number; // varaqdan olingan (name,status) juftlari
  updated: { id: string; name: string; from: string | null; to: string }[];
  unchanged: number;
  ambiguous: { name: string; count: number }[]; // bir necha loyihaga mos keldi
  unmatched: string[]; // heç bir loyihaga mos kelmadi
  error?: string;
};

async function fetchCsv(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "ichki-ijro-sync" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`sheet_http_${res.status}`);
    // Hajmni bufferlaşdan OLDIN, imkon bölsa, Content-Length böyiça rad etamiz.
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > 8_000_000) throw new Error("sheet_too_large");
    const text = await res.text();
    if (text.length > 8_000_000) throw new Error("sheet_too_large");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Asosiy sinxronlaş. dryRun=true bölsa heç narsa yozmaydi — faqat nima özgarişini
 * qaytaradi (yoziş oldidan tekşiriş uçun). Har qanday olib keliş/tahlil xatosida
 * yoki juftlar umuman topilmasa — heç narsani özgartirmaydi (buzuq/böş varaq
 * mavjud holatlarni öçirib yubormasligi uçun).
 */
export async function syncProjectStatusesFromSheet(opts: { dryRun?: boolean } = {}): Promise<SyncResult> {
  const dryRun = !!opts.dryRun;
  const result: SyncResult = { ok: false, dryRun, fetched: 0, updated: [], unchanged: 0, ambiguous: [], unmatched: [] };

  let pairs: SheetRow[];
  try {
    const csv = await fetchCsv(sheetCsvUrl());
    pairs = extractRows(parseCsv(csv));
  } catch (e) {
    result.error = e instanceof Error ? e.message : "fetch_failed";
    return result;
  }
  result.fetched = pairs.length;
  // Xavfsizlik toʼsiği: hiç juftlik yöq = tahlil buzilgan yoki varaq böş → toʼxtaymiz.
  if (pairs.length === 0) {
    result.error = "no_rows_parsed";
    return result;
  }

  // DB loyihalarini skelet böyiça indekslaymiz.
  const all = await db
    .select({ id: projects.id, name: projects.name, currentStatus: projects.currentStatus, sheetSyncedStatus: projects.sheetSyncedStatus })
    .from(projects);
  type Proj = { id: string; name: string; currentStatus: string | null; sheetSyncedStatus: string | null };
  const byKey = new Map<string, Proj[]>();
  for (const p of all) {
    const key = normalizeName(p.name);
    if (!key) continue;
    (byKey.get(key) ?? byKey.set(key, []).get(key)!).push(p);
  }

  // Varaq qatorlarini skelet böyiça guruhlaymiz. Bir skeletga bir neça HAR XIL
  // qator tuşsa (masalan «Йўл-барс...» Мультсериал va китоб — turi olib taşlangaç
  // bir xil bölib qoladi), taxmin qilMASdan ambiguous deb öтказамиз ("muammo
  // bölmasin" tamoyili).
  const sheetByKey = new Map<string, SheetRow[]>();
  for (const r of pairs) {
    const key = normalizeName(r.name);
    if (!key) continue;
    (sheetByKey.get(key) ?? sheetByKey.set(key, []).get(key)!).push(r);
  }

  const plans: { id: string; name: string; from: string | null; to: string }[] = [];
  for (const [key, rs] of sheetByKey) {
    if (rs.length > 1) { result.ambiguous.push({ name: rs.map((x) => x.name.trim()).join(" | "), count: rs.length }); continue; }
    const r = rs[0];
    const status = r.status.trim();
    if (!status) continue; // böş holat bilan üstiga yozmaymiz
    const matches = byKey.get(key);
    if (!matches || matches.length === 0) { result.unmatched.push(r.name.trim()); continue; }
    if (matches.length > 1) { result.ambiguous.push({ name: r.name.trim(), count: matches.length }); continue; }
    const p = matches[0];
    // ÖZGARISH ANIQLASH: faqat varaqdagi matn OXIRGI sinxrondan beri özgargan
    // bölsa yozamiz. Şu tariqa ilova içida qölda kiritilgan yangi izohni eskirgan
    // varaq üstiga yozib öçirmaymiz (odam tahriri saqlanadi; varaq haqiqatan
    // yangilanganda esa varaq üstun böladi). Birinçi marta (sheetSyncedStatus=null)
    // varaqdan urug'lantiramiz.
    if (p.sheetSyncedStatus !== null && p.sheetSyncedStatus === status) { result.unchanged++; continue; }
    plans.push({ id: p.id, name: p.name, from: p.currentStatus ?? null, to: status });
  }

  if (!dryRun) {
    for (const plan of plans) {
      await db.update(projects).set({ currentStatus: plan.to, sheetSyncedStatus: plan.to, updatedAt: new Date() }).where(eq(projects.id, plan.id));
      try {
        await logActivity({
          userId: null,
          action: "project.status_synced",
          entityType: "project",
          entityId: plan.id,
          oldValue: { currentStatus: plan.from },
          newValue: { currentStatus: plan.to, source: "google_sheet" },
        });
      } catch { /* audit — ikkinçi darajali, sinxronni toʼxtatmaydi */ }
    }
    // Yangilangan bölsa — sahifalarni qayta yaratamiz, toki yangi holat darhol körinsin.
    if (plans.length) {
      revalidatePath("/dashboard");
      revalidatePath("/projects");
      revalidatePath("/contractors");
      for (const plan of plans) {
        revalidatePath(`/projects/${plan.id}`);
        revalidatePath(`/contractor/projects/${plan.id}`);
      }
    }
  }

  result.updated = plans;
  result.ok = true;
  return result;
}
