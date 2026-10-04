// PURE helpers for the normative registry + acknowledgement sheet (staff: normative-ack).
// No DB, no "server-only", no "@/" imports — shared by server queries/actions, the PDF,
// client components and vitest.

// ---------------- registry vocabulary ----------------

export const DOC_TYPES = ["buyruq", "nizom", "yoriqnoma", "qaror", "farmoyish", "qonun", "boshqa"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_STATUSES = ["active", "repealed"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

/** Rekvizitlar of one normative document (normative_document_meta row). */
export type DocMeta = {
  docType: DocType | null;
  docNumber: string | null;
  /** YYYY-MM-DD */
  docDate: string | null;
  issuedBy: string | null;
  status: DocStatus;
  supersededById: string | null;
  summary: string | null;
};

/** Uzbek labels for server-generated texts (PDF sheet). The UI uses i18n keys type.<docType>. */
export const DOC_TYPE_LABEL_UZ: Record<DocType, string> = {
  buyruq: "Buyruq",
  nizom: "Nizom",
  yoriqnoma: "Yoʻriqnoma",
  qaror: "Qaror",
  farmoyish: "Farmoyish",
  qonun: "Qonunchilik hujjati",
  boshqa: "Boshqa",
};

export const POSITION_LABEL_UZ: Record<string, string> = {
  direktor: "Direktor",
  orinbosar: "Oʻrinbosar",
  koordinator: "Koordinator",
  bolim_boshligi: "Boʻlim boshligʻi",
  bosh_mutaxassis: "Bosh mutaxassis",
  yetakchi_mutaxassis: "Yetakchi mutaxassis",
  mutaxassis: "Mutaxassis",
  hr: "HR",
  kontragent: "Studiya",
};

export function isDocType(x: unknown): x is DocType {
  return typeof x === "string" && (DOC_TYPES as readonly string[]).includes(x);
}

export function isDocStatus(x: unknown): x is DocStatus {
  return typeof x === "string" && (DOC_STATUSES as readonly string[]).includes(x);
}

// ---------------- RBAC (pure) ----------------

/** Edit any document's rekvizitlar, view/remind/print any acknowledgement request. */
export const ACK_MANAGER_POSITIONS: readonly string[] = ["direktor", "orinbosar", "hr"];

/** May send a document for acknowledgement (limited roles only to their departments — see canSendToAudience). */
export const ACK_SENDER_POSITIONS: readonly string[] = ["direktor", "orinbosar", "hr", "bolim_boshligi", "koordinator"];

/** Positions that can be chosen as an audience (kontragent is external — never). */
export const ACK_AUDIENCE_POSITIONS = [
  "direktor",
  "orinbosar",
  "koordinator",
  "bolim_boshligi",
  "bosh_mutaxassis",
  "yetakchi_mutaxassis",
  "mutaxassis",
  "hr",
] as const;

type Actor = { id?: string | null; position?: string | null };

export function isAckManager(position: string | null | undefined): boolean {
  return !!position && ACK_MANAGER_POSITIONS.includes(position);
}

export function canSendAck(position: string | null | undefined): boolean {
  return !!position && ACK_SENDER_POSITIONS.includes(position);
}

/** Rekvizitlar: the uploader, direktor, orinbosar, hr. */
export function canEditDocMeta(me: Actor, uploaderId: string | null | undefined): boolean {
  if (!me.position || me.position === "kontragent") return false;
  if (isAckManager(me.position)) return true;
  return !!me.id && !!uploaderId && me.id === uploaderId;
}

/** Progress / remind / PDF of a request: the requester, direktor, orinbosar, hr. */
export function canManageAckRequest(me: Actor, requestedById: string | null | undefined): boolean {
  if (!me.position || me.position === "kontragent") return false;
  if (isAckManager(me.position)) return true;
  return !!me.id && !!requestedById && me.id === requestedById;
}

/** Manual "Eslatish" is allowed at most once per this many hours per request. */
export const REMIND_COOLDOWN_HOURS = 12;

export function remindTooSoon(last: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!last) return false;
  const t = new Date(last).getTime();
  if (Number.isNaN(t)) return false;
  return now.getTime() - t < REMIND_COOLDOWN_HOURS * 3_600_000;
}

// ---------------- dates (Tashkent, +05:00, no DST) ----------------

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Tashkent calendar date (YYYY-MM-DD) of an instant. */
export function tashkentYmd(d: Date = new Date()): string {
  return new Date(d.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-31). */
export function isYmd(s: unknown): s is string {
  if (typeof s !== "string" || !YMD.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetweenYmd(from: string, to: string): number {
  return Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
}

/** 2026-10-01 → 01.10.2026 ("" for empty input). */
export function ymdToDots(ymd: string | null | undefined): string {
  if (!ymd) return "";
  const [y, m, d] = ymd.slice(0, 10).split("-");
  return y && m && d ? `${d}.${m}.${y}` : ymd;
}

/** dd.mm.yyyy HH:mm in Tashkent time ("" for empty input). Deterministic on server and client. */
export function formatTashkentDateTime(d: Date | string | null | undefined): string {
  if (!d) return "";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "";
  const x = new Date(t.getTime() + TASHKENT_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(x.getUTCDate())}.${p(x.getUTCMonth() + 1)}.${x.getUTCFullYear()} ${p(x.getUTCHours())}:${p(x.getUTCMinutes())}`;
}

export type DeadlineTone = "red" | "amber" | "muted";
export type DeadlineLabel = { key: "overdueDays" | "dueToday" | "dueTomorrow" | "daysLeft"; count: number; tone: DeadlineTone };

/** Countdown chip for a pending acknowledgement (i18n key under staffX.normativeAck). */
export function deadlineLabel(daysLeft: number): DeadlineLabel {
  if (daysLeft < 0) return { key: "overdueDays", count: -daysLeft, tone: "red" };
  if (daysLeft === 0) return { key: "dueToday", count: 0, tone: "red" };
  if (daysLeft === 1) return { key: "dueTomorrow", count: 1, tone: "amber" };
  return { key: "daysLeft", count: daysLeft, tone: daysLeft <= 3 ? "amber" : "muted" };
}

export function ackPercent(done: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

// ---------------- registry search / filters ----------------

export type RegistryFilter = {
  q: string;
  type: DocType | "all";
  status: DocStatus | "all";
  year: number | "all";
};

export const DEFAULT_REGISTRY_FILTER: RegistryFilter = { q: "", type: "all", status: "all", year: "all" };

export type FilterableDoc = {
  fileName: string;
  uploadedAt: Date | string;
  meta?: Pick<DocMeta, "docType" | "docNumber" | "docDate" | "issuedBy" | "status" | "summary"> | null;
};

export function isFilterActive(f: RegistryFilter): boolean {
  return f.q.trim() !== "" || f.type !== "all" || f.status !== "all" || f.year !== "all";
}

/** Lower-cases, unifies the apostrophe family (ʻ ʼ ‘ ’ ` ') and drops "№" so "№ 45", "45" and "Oʻz" / "O'z" all match. */
export function normalizeSearch(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[ʻʼ‘’`']/g, "'")
    .replace(/№/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function docStatus(doc: FilterableDoc): DocStatus {
  return doc.meta?.status === "repealed" ? "repealed" : "active";
}

/** Registry year: the document's own date when known, otherwise the upload year (Tashkent). */
export function docYear(doc: FilterableDoc): number {
  const ymd = doc.meta?.docDate ?? tashkentYmd(new Date(doc.uploadedAt));
  return Number(ymd.slice(0, 4));
}

export function matchesRegistryFilter(doc: FilterableDoc, f: RegistryFilter): boolean {
  if (f.type !== "all" && doc.meta?.docType !== f.type) return false;
  if (f.status !== "all" && docStatus(doc) !== f.status) return false;
  if (f.year !== "all" && docYear(doc) !== f.year) return false;
  const q = normalizeSearch(f.q);
  if (!q) return true;
  const hay = normalizeSearch(
    [doc.fileName, doc.meta?.docNumber, doc.meta?.summary, doc.meta?.issuedBy].filter(Boolean).join(" \u0001 ")
  );
  return q.split(" ").every((term) => hay.includes(term));
}

export function filterRegistry<T extends FilterableDoc>(docs: T[], f: RegistryFilter): T[] {
  if (!isFilterActive(f)) return docs;
  return docs.filter((d) => matchesRegistryFilter(d, f));
}

/** Distinct registry years, newest first. */
export function registryYears(docs: FilterableDoc[]): number[] {
  const set = new Set<number>();
  for (const d of docs) {
    const y = docYear(d);
    if (Number.isFinite(y)) set.add(y);
  }
  return [...set].sort((a, b) => b - a);
}

// ---------------- shared view types (serialised from server to client) ----------------

export type PendingAckItem = {
  requestId: string;
  documentId: string;
  fileName: string;
  fileUrl: string;
  isLink: boolean;
  /** YYYY-MM-DD */
  deadline: string;
  /** Calendar days from today (Tashkent) to the deadline, computed on the server. */
  daysLeft: number;
  message: string | null;
  openedAt: Date | null;
  requestedByName: string | null;
};

export type AckSummaryItem = {
  requestId: string;
  /** YYYY-MM-DD */
  deadline: string;
  total: number;
  acknowledged: number;
  createdAt?: Date | string;
};

export type AckRecipientItem = {
  userId: string;
  fullName: string;
  position: string;
  positionTitle: string | null;
  /** position_title ?? position */
  positionLabel: string;
  departmentName: string | null;
  avatarUrl: string | null;
  openedAt: Date | null;
  acknowledgedAt: Date | null;
};

export type AckComposerPerson = {
  id: string;
  fullName: string;
  position: string;
  departmentName: string | null;
  avatarUrl: string | null;
};

export type AckComposerOptions = {
  allowed: "any" | string[];
  departments: { id: string; name: string }[];
  positions: string[];
  people: AckComposerPerson[];
};

export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

// ---------------- error codes → i18n keys (staffX.normativeAck.*) ----------------

const ERROR_KEYS: Record<string, string> = {
  forbidden_audience: "forbiddenAudience",
  empty_audience: "emptyAudience",
  too_soon: "tooSoon",
  open_first: "openFirst",
  date_in_past: "errors.dateInPast",
  not_ready: "errors.notReady",
  forbidden: "errors.forbidden",
  not_found: "errors.notFound",
  invalid: "errors.invalid",
  supersede_cycle: "errors.supersedeCycle",
};

export function errorKey(code: string | null | undefined): string {
  return (code && ERROR_KEYS[code]) || "errors.generic";
}

/** Splits an array into chunks of `size` (bulk inserts). */
export function chunk<T>(xs: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}
