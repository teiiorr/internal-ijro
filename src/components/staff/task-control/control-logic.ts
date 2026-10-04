/**
 * Pure (framework-free) helpers and shared types for the task-control board
 * ("Ijro nazorati"). Imported by the server query/action/export route AND by the
 * client components, so this file must never import "server-only" modules.
 */
import type { Position } from "@/lib/db/schema";
import type { TaskPriority } from "@/lib/permissions/tasks";

export type ControlScope = "mine" | "department" | "all";
export const CONTROL_SCOPES: readonly ControlScope[] = ["mine", "department", "all"] as const;

export type ControlFilter = "no_response" | "late" | "to_review";
export const CONTROL_FILTERS: readonly ControlFilter[] = ["no_response", "late", "to_review"] as const;

export type AssigneeStatus = "todo" | "in_progress" | "under_review" | "completed" | "rejected";

/** Statuses that still owe an answer — these can be nudged. */
export const OPEN_ASSIGNEE_STATUSES: readonly AssigneeStatus[] = ["todo", "in_progress", "rejected"] as const;

export const CONTROL_PAGE_SIZE = 30;
export const NUDGE_THROTTLE_MS = 24 * 60 * 60 * 1000;
export const EXPORT_MAX_ROWS = 3000;
export const EXPORT_MAX_RANGE_DAYS = 366;

const PRIORITIES: readonly TaskPriority[] = ["low", "medium", "high", "urgent"];
const DAY_MS = 86_400_000;
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

export type ControlAssignee = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  departmentName: string | null;
  status: AssigneeStatus;
  /** ISO timestamp string. */
  responseSubmittedAt: string | null;
  /** Response payload — only filled while the answer awaits review (status = under_review). */
  responseText: string | null;
  responseFileUrl: string | null;
  responseFileName: string | null;
  overdue: boolean;
  /** Contractor assignee — never nudged from the board (the server ignores them anyway). */
  kontragent: boolean;
  nudgeCount: number;
  /** ISO timestamp string. */
  lastNudgeAt: string | null;
};

export type ControlRow = {
  id: string;
  registrationNumber: string | null;
  title: string;
  deadline: Date | null;
  priority: string;
  status: string;
  projectId: string | null;
  projectName: string | null;
  createdByUserId: string;
  creatorName: string;
  /** Assignees whose answer was accepted (status = completed). */
  answered: number;
  /** Number of assignees on the task. */
  total: number;
  /** Assignees whose answer awaits review (status = under_review). */
  underReview: number;
  lastResponseAt: Date | null;
  assignees: ControlAssignee[];
};

export type ControlKpis = {
  openGiven: number;
  awaitingAnswer: number;
  awaitingMyApproval: number;
  lateAssignees: number;
  /** 0..100, or null when nothing was completed in the window. */
  onTimeRate90d: number | null;
};

export type ControlExportRow = {
  registrationNumber: string | null;
  title: string;
  assignee: string;
  department: string | null;
  /** ISO timestamp string. */
  deadline: string | null;
  /** ISO timestamp string. */
  responseSubmittedAt: string | null;
  status: AssigneeStatus;
  lateDays: number | null;
  nudgeCount: number;
};

// ---------------- scopes ----------------

/** Which board scopes a user may request. 'mine' is always available. */
export function allowedScopesFor(position: Position, departmentId: string | null): ControlScope[] {
  const out: ControlScope[] = ["mine"];
  if (position === "koordinator" || (position === "bolim_boshligi" && departmentId)) out.push("department");
  if (position === "direktor" || position === "orinbosar") out.push("all");
  return out;
}

/** Validates a requested scope against the allowed list; anything else silently falls back to 'mine'. */
export function resolveScope(requested: string | null | undefined, allowed: readonly ControlScope[]): ControlScope {
  return requested && (allowed as readonly string[]).includes(requested) ? (requested as ControlScope) : "mine";
}

// ---------------- search-param parsing ----------------

export function parseFilter(v: string | null | undefined): ControlFilter | undefined {
  return v && (CONTROL_FILTERS as readonly string[]).includes(v) ? (v as ControlFilter) : undefined;
}

export function parsePriority(v: string | null | undefined): TaskPriority | undefined {
  return v && (PRIORITIES as readonly string[]).includes(v) ? (v as TaskPriority) : undefined;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseUuid(v: string | null | undefined): string | undefined {
  return v && UUID_RE.test(v) ? v : undefined;
}

/** Accepts only real calendar dates in YYYY-MM-DD form. */
export function parseIsoDate(v: string | null | undefined): string | undefined {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return undefined;
  return v;
}

export function parsePage(v: string | null | undefined): number {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 10_000) : 1;
}

// ---------------- dates ----------------

/** Calendar date (YYYY-MM-DD) of an instant in Tashkent time. */
export function tashkentDate(d: Date | string): string {
  return new Date(new Date(d).getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS);
}

/**
 * Normalises the export deadline range: defaults to ±90 days around today,
 * swaps an inverted range, and clamps the span to EXPORT_MAX_RANGE_DAYS.
 */
export function clampExportRange(
  fromRaw: string | null | undefined,
  toRaw: string | null | undefined,
  today: string
): { from: string; to: string } {
  let from = parseIsoDate(fromRaw);
  let to = parseIsoDate(toRaw);
  if (!from && !to) return { from: addDays(today, -90), to: addDays(today, 90) };
  if (from && !to) to = addDays(from, EXPORT_MAX_RANGE_DAYS);
  if (!from && to) from = addDays(to, -EXPORT_MAX_RANGE_DAYS);
  let f = from as string;
  let t = to as string;
  if (f > t) [f, t] = [t, f];
  if (diffDays(t, f) > EXPORT_MAX_RANGE_DAYS) f = addDays(t, -EXPORT_MAX_RANGE_DAYS);
  return { from: f, to: t };
}

/**
 * Days an assignee was (or still is) late against the task deadline, in Tashkent
 * calendar days. Answered assignees are measured at their response (or completion)
 * time; open ones against `today`. Never negative; null when there is no deadline.
 */
export function lateDays(
  a: {
    deadline: Date | string | null;
    status: AssigneeStatus;
    responseSubmittedAt: Date | string | null;
    completedAt: Date | string | null;
  },
  today: string
): number | null {
  if (!a.deadline) return null;
  const deadlineDay = tashkentDate(a.deadline);
  const answeredAt = a.status === "under_review" || a.status === "completed" ? a.responseSubmittedAt ?? a.completedAt : null;
  const endDay = answeredAt ? tashkentDate(answeredAt) : today;
  return Math.max(0, diffDays(endDay, deadlineDay));
}

// ---------------- nudges ----------------

export function isOpenStatus(status: string): boolean {
  return (OPEN_ASSIGNEE_STATUSES as readonly string[]).includes(status);
}

export function isNudgeThrottled(lastAt: Date | string | null | undefined, now: number = Date.now()): boolean {
  if (!lastAt) return false;
  const t = new Date(lastAt).getTime();
  return Number.isFinite(t) && now - t < NUDGE_THROTTLE_MS;
}

/** Assignees worth pre-selecting in the nudge dialog: still open and not nudged in the last 24h. */
export function laggingAssigneeIds(
  assignees: ReadonlyArray<{ userId: string; status: string; lastNudgeAt: string | null }>,
  now: number = Date.now()
): string[] {
  return assignees.filter((a) => isOpenStatus(a.status) && !isNudgeThrottled(a.lastNudgeAt, now)).map((a) => a.userId);
}

// ---------------- presentation ----------------

/** Ring colour (CSS custom property) of an assignee chip. */
export function chipRingColor(status: string): string {
  switch (status) {
    case "under_review":
      return "var(--warning)";
    case "completed":
      return "var(--success)";
    case "rejected":
      return "var(--danger)";
    default:
      return "var(--primary)";
  }
}

/** Builds a /tasks/control URL, dropping empty params. */
export function controlHref(params: Record<string, string | number | null | undefined>, base = "/tasks/control"): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `${base}?${q}` : base;
}
