// PURE helpers for council resolutions (Kengash qarorlari ijrosi).
// No DB, no "server-only", no "@/" imports — this file is shared by server code,
// client components, the standalone worker (scripts/jobs/council-resolutions.ts)
// and vitest.
import type { Position } from "../db/schema";

export const EFFECTIVE_STATUSES = ["open", "due_soon", "overdue", "done", "cancelled"] as const;
export type EffectiveStatus = (typeof EFFECTIVE_STATUSES)[number];

export const COUNCIL_KINDS = ["ekspert", "smeta"] as const;
export type CouncilKind = (typeof COUNCIL_KINDS)[number];

/** A point is "due soon" when its due date is within this many days (inclusive). */
export const DUE_SOON_DAYS = 3;

/** Who sees /kengashlar/ijro and the resolution blocks (same as the kengash sidebar items). */
export const STAFF_POSITIONS: Position[] = [
  "direktor",
  "orinbosar",
  "koordinator",
  "bolim_boshligi",
  "bosh_mutaxassis",
  "yetakchi_mutaxassis",
  "mutaxassis",
];

/** Positions that may edit the points of ANY meeting (besides the meeting creator and project editors). */
export const RESOLUTION_EDITOR_POSITIONS: Position[] = ["direktor", "orinbosar", "koordinator", "bolim_boshligi"];

/** These positions land on the "mine" filter by default. */
export const DEFAULT_MINE_POSITIONS: Position[] = ["mutaxassis", "yetakchi_mutaxassis", "bosh_mutaxassis"];

/** Uzbek labels used in server-generated texts (task titles, agenda topics, XLSX). */
export const COUNCIL_KIND_LABEL_UZ: Record<CouncilKind, string> = {
  ekspert: "Ekspertlar Kengashi",
  smeta: "Smeta komissiyasi",
};

export const EFFECTIVE_STATUS_LABEL_UZ: Record<EffectiveStatus, string> = {
  open: "Ochiq",
  due_soon: "Muddati yaqin",
  overdue: "Muddati oʻtgan",
  done: "Bajarilgan",
  cancelled: "Bekor qilingan",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

export function isStaffPosition(p: string): boolean {
  return (STAFF_POSITIONS as string[]).includes(p);
}

export function isCouncilKind(x: unknown): x is CouncilKind {
  return typeof x === "string" && (COUNCIL_KINDS as readonly string[]).includes(x);
}

export function isEffectiveStatus(x: unknown): x is EffectiveStatus {
  return typeof x === "string" && (EFFECTIVE_STATUSES as readonly string[]).includes(x);
}

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-31). */
export function isValidIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function isGuid(s: unknown): s is string {
  return typeof s === "string" && GUID.test(s);
}

/** YYYY-MM-DD shifted by `days` calendar days. */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Tashkent calendar date (YYYY-MM-DD) of an instant. */
export function tashkentDateOf(d: Date | string): string {
  return new Date(new Date(d).getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Today's Tashkent date (YYYY-MM-DD). */
export function tashkentToday(now: Date = new Date()): string {
  return tashkentDateOf(now);
}

/** "2026-09-12" → "12.09.2026". Empty string for null/invalid input. */
export function ddmmyyyy(iso: string | null | undefined): string {
  if (!iso || !ISO_DATE.test(iso.slice(0, 10))) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

/**
 * Effective status of a point.
 *  - cancelled wins;
 *  - a completed linked task (or a manual close) → done;
 *  - due date before today → overdue; within DUE_SOON_DAYS → due_soon; otherwise open.
 */
export function effectiveStatus(
  r: { status: string; dueDate: string | null; taskStatus: string | null },
  todayIso: string
): EffectiveStatus {
  if (r.status === "cancelled") return "cancelled";
  if (r.taskStatus === "completed" || r.status === "done") return "done";
  if (r.dueDate) {
    const due = r.dueDate.slice(0, 10);
    if (due < todayIso) return "overdue";
    if (due <= addDaysIso(todayIso, DUE_SOON_DAYS)) return "due_soon";
  }
  return "open";
}

export function isActiveStatus(s: EffectiveStatus): boolean {
  return s === "open" || s === "due_soon" || s === "overdue";
}

export function emptyCounters(): Record<EffectiveStatus, number> {
  return { open: 0, due_soon: 0, overdue: 0, done: 0, cancelled: 0 };
}

export function countByStatus(rows: Array<{ effective: EffectiveStatus }>): Record<EffectiveStatus, number> {
  const c = emptyCounters();
  for (const r of rows) c[r.effective]++;
  return c;
}

const STATUS_RANK: Record<EffectiveStatus, number> = { overdue: 0, due_soon: 1, open: 2, done: 3, cancelled: 4 };

/**
 * Tracking order: overdue → due soon → open (each by due date, undated last),
 * then done / cancelled (newest meeting first). Ties: newest meeting, then point number.
 */
export function sortResolutions<
  T extends { effective: EffectiveStatus; dueDate: string | null; meetingDate: string; number: number },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const r = STATUS_RANK[a.effective] - STATUS_RANK[b.effective];
    if (r !== 0) return r;
    if (isActiveStatus(a.effective)) {
      const ad = a.dueDate ?? "9999-12-31";
      const bd = b.dueDate ?? "9999-12-31";
      if (ad !== bd) return ad < bd ? -1 : 1;
    }
    if (a.meetingDate !== b.meetingDate) return a.meetingDate < b.meetingDate ? 1 : -1;
    return a.number - b.number;
  });
}

// ---------------- generated texts ----------------

export function resolutionTaskTitle(number: number, text: string): string {
  return `Kengash qarori №${number}: ${text.trim()}`.slice(0, 500);
}

export function resolutionTaskDescription(text: string, kind: string, meetingDateIso: string): string {
  const label = isCouncilKind(kind) ? COUNCIL_KIND_LABEL_UZ[kind] : kind;
  return `${text.trim()}\n\n${label} majlisi, ${ddmmyyyy(meetingDateIso)}`;
}

/** Agenda topic for the carry-over item: "№3-qaror ijrosi toʻgʻrisida (12.09.2026 majlisi)". */
export function carryoverTopic(number: number, meetingDateIso: string): string {
  return `№${number}-qaror ijrosi toʻgʻrisida (${ddmmyyyy(meetingDateIso)} majlisi)`.slice(0, 500);
}

/** Task deadline (ISO instant) for a point due on `due` (YYYY-MM-DD). */
export function taskDeadlineFromDue(due: string): string {
  return new Date(`${due}T00:00:00Z`).toISOString();
}

export function dueReminderMessage(n: number): string {
  return `Kengash qarori №${n} ijro muddati 3 kundan soʻng / Срок исполнения решения совета №${n} через 3 дня`;
}

export function overdueReminderMessage(n: number, dueIso: string): string {
  const d = ddmmyyyy(dueIso);
  return `Kengash qarori №${n} ijro muddati oʻtdi (${d}) / Срок исполнения решения совета №${n} истёк (${d})`;
}

// ---------------- permissions (pure parts) ----------------

/**
 * Manual close: only an open point; a point linked to a task closes itself when the task
 * completes (direktor may override); the caller must be the responsible user or an editor.
 */
export function canCloseResolution(
  r: { status: string; effective: EffectiveStatus; taskId: string | null; responsibleUserId: string | null },
  me: { id: string; position: string },
  canEdit: boolean
): boolean {
  if (r.status !== "open" || !isActiveStatus(r.effective)) return false;
  if (r.taskId && me.position !== "direktor") return false;
  return canEdit || r.responsibleUserId === me.id;
}

export function canSendResolutionAsTask(
  r: { status: string; effective: EffectiveStatus; taskId: string | null },
  canEdit: boolean,
  canAssign: boolean
): boolean {
  return canEdit && canAssign && r.status === "open" && !r.taskId && isActiveStatus(r.effective);
}

export function canDeleteResolution(r: { taskId: string | null }, canEdit: boolean): boolean {
  return canEdit && !r.taskId;
}

export function canCancelResolution(r: { status: string; effective: EffectiveStatus }, canEdit: boolean): boolean {
  return canEdit && r.status === "open" && isActiveStatus(r.effective);
}

export type RowPermissions = {
  canEdit: boolean;
  canClose: boolean;
  canSend: boolean;
  canCancel: boolean;
  canDelete: boolean;
};

/** Every per-row action flag in one place (UI hint only — the server re-checks each action). */
export function rowPermissions(
  r: { status: string; effective: EffectiveStatus; taskId: string | null; responsibleUserId: string | null },
  me: { id: string; position: string },
  canEdit: boolean,
  canAssign: boolean
): RowPermissions {
  return {
    canEdit,
    canClose: canCloseResolution(r, me, canEdit),
    canSend: canSendResolutionAsTask(r, canEdit, canAssign),
    canCancel: canCancelResolution(r, canEdit),
    canDelete: canDeleteResolution(r, canEdit),
  };
}

// ---------------- filters (page + XLSX export) ----------------

export type ResolutionFilters = {
  kind?: CouncilKind;
  status?: EffectiveStatus;
  responsibleId?: string;
  departmentId?: string;
  mine: boolean;
};

export function defaultMine(position: string): boolean {
  return (DEFAULT_MINE_POSITIONS as string[]).includes(position);
}

/** Parses ?kind&status&responsible&department&mine. `mine` absent → the position's default. */
export function parseResolutionFilters(get: (key: string) => string | null | undefined, position: string): ResolutionFilters {
  const kind = get("kind");
  const status = get("status");
  const responsible = get("responsible");
  const department = get("department");
  const mine = get("mine");
  return {
    kind: isCouncilKind(kind) ? kind : undefined,
    status: isEffectiveStatus(status) ? status : undefined,
    responsibleId: isGuid(responsible) ? responsible : undefined,
    departmentId: isGuid(department) ? department : undefined,
    mine: mine === "1" ? true : mine === "0" ? false : defaultMine(position),
  };
}

/** Builds `${base}?…` for a filter state; `mine` is written only when it differs from the default. */
export function resolutionsHref(f: Partial<ResolutionFilters>, base: string, position: string): string {
  const p = new URLSearchParams();
  if (f.kind) p.set("kind", f.kind);
  if (f.status) p.set("status", f.status);
  if (f.responsibleId && !f.mine) p.set("responsible", f.responsibleId);
  if (f.departmentId) p.set("department", f.departmentId);
  const mine = !!f.mine;
  if (mine !== defaultMine(position)) p.set("mine", mine ? "1" : "0");
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}
