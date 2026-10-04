// Pure helpers for the task-edit feature (task editing, deadline extension
// requests, history timeline). No "server-only", no DB, no React — safe to import
// from server actions, server queries, client components and vitest alike.
import type { DeadlineRequestStatus } from "@/lib/db/tables/task-edit";

// ---------------------------------------------------------------- dates

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar date ('YYYY-MM-DD') of an instant in Tashkent (UTC+5). */
export function toTashkentIso(d: Date | string): string {
  return new Date(new Date(d).getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/** True for a real 'YYYY-MM-DD' calendar date. */
export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Storage convention shared with new-task-form: a date-only deadline is UTC midnight. */
export function isoToDeadline(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDaysIso(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Whole calendar days from `fromIso` to `toIso` (positive when `toIso` is later). */
export function diffDaysIso(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

/** 'dd.mm' for notifications and compact chips; '—' when absent. */
export function fmtDdMm(iso: string | null | undefined): string {
  if (!iso || !ISO_DATE.test(iso)) return "—";
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}

// ---------------------------------------------------------------- permissions

export const MANAGER_POSITIONS = ["direktor", "orinbosar"] as const;

/** Same rule as reviewAssigneeResponse: the creator, or direktor / orinbosar. */
export function canManageTask(me: { id: string; position: string }, t: { createdByUserId: string }): boolean {
  return t.createdByUserId === me.id || (MANAGER_POSITIONS as readonly string[]).includes(me.position);
}

export const OPEN_ASSIGNEE_STATUSES = ["todo", "in_progress", "rejected"] as const;

export function isOpenAssigneeStatus(status: string): boolean {
  return (OPEN_ASSIGNEE_STATUSES as readonly string[]).includes(status);
}

/** Why an assignee row cannot be removed, or null when removal is allowed. */
export function removalBlocker(
  row: { status: string; responseSubmittedAt: Date | string | null },
  totalRows: number
): "assignee_has_response" | "last_assignee" | null {
  if (row.responseSubmittedAt || row.status === "under_review" || row.status === "completed") {
    return "assignee_has_response";
  }
  if (totalRows <= 1) return "last_assignee";
  return null;
}

// ---------------------------------------------------------------- edit diff

export type EditableTaskFields = {
  title: string;
  description: string | null;
  priority: string;
  /** Tashkent calendar date or null. */
  deadlineDate: string | null;
};

export type EditableField = keyof EditableTaskFields;

export type TaskDiff = {
  changed: EditableField[];
  old: Partial<EditableTaskFields>;
  next: Partial<EditableTaskFields>;
};

/** Whitespace-only descriptions are stored as NULL; surrounding whitespace is ignored. */
export function normalizeDescription(s: string | null | undefined): string | null {
  const v = (s ?? "").trim();
  return v ? v : null;
}

export function buildTaskDiff(prev: EditableTaskFields, next: EditableTaskFields): TaskDiff {
  const diff: TaskDiff = { changed: [], old: {}, next: {} };
  const a = { ...prev, title: prev.title.trim(), description: normalizeDescription(prev.description) };
  const b = { ...next, title: next.title.trim(), description: normalizeDescription(next.description) };
  const keys: EditableField[] = ["title", "description", "priority", "deadlineDate"];
  for (const k of keys) {
    if ((a[k] ?? null) !== (b[k] ?? null)) {
      diff.changed.push(k);
      (diff.old as Record<string, unknown>)[k] = a[k] ?? null;
      (diff.next as Record<string, unknown>)[k] = b[k] ?? null;
    }
  }
  return diff;
}

/** On a completed task only the description may change. */
export function touchesLockedFields(diff: TaskDiff): boolean {
  return diff.changed.some((k) => k !== "description");
}

// ---------------------------------------------------------------- extension requests

/** Earliest date an assignee may ask for: the day after the deadline, never before today. */
export function minExtensionDate(currentIso: string, todayIso: string): string {
  const next = addDaysIso(currentIso, 1);
  return next > todayIso ? next : todayIso;
}

export function extensionDateError(
  requestedIso: string,
  currentIso: string | null,
  todayIso: string
): "no_deadline" | "not_later" | null {
  if (!currentIso) return "no_deadline";
  if (!isIsoDate(requestedIso)) return "not_later";
  if (!(requestedIso > currentIso) || requestedIso < todayIso) return "not_later";
  return null;
}

/**
 * Whether approving a request moves the task deadline. An approval never shortens:
 * another request or a manual edit may already have pushed the deadline further.
 */
export function approvalMovesDeadline(currentIso: string | null, requestedIso: string): boolean {
  return currentIso === null || requestedIso > currentIso;
}

export type DeadlineRequestView = {
  id: string;
  requestedById: string;
  requesterName: string;
  requesterAvatar: string | null;
  previousDeadline: Date | null;
  requestedDeadline: Date;
  /** Tashkent calendar dates of the two deadlines (convenience for the UI). */
  previousDate: string | null;
  requestedDate: string;
  reason: string;
  status: DeadlineRequestStatus;
  deciderName: string | null;
  decisionNote: string | null;
  decidedAt: Date | null;
  createdAt: Date;
};

// ---------------------------------------------------------------- action results

export type TaskEditErrorCode =
  | "forbidden"
  | "not_found"
  | "invalid"
  | "task_completed"
  | "assignee_has_response"
  | "last_assignee"
  | "forbidden_assign"
  | "assignee_not_found"
  | "not_assignee"
  | "no_deadline"
  | "not_later"
  | "already_pending"
  | "not_pending"
  | "note_required"
  | "unavailable";

/**
 * Server actions return expected failures as values: production builds replace
 * thrown error messages with a generic text, so the client could not map them.
 */
export type TaskEditResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: TaskEditErrorCode; detail?: string };

/** i18n key (inside the staffX.taskEdit namespace) for an error code. */
export function errorMessageKey(code: TaskEditErrorCode | string): string {
  switch (code) {
    case "task_completed":
      return "completedOnlyDescription";
    case "assignee_has_response":
      return "cannotRemoveResponded";
    case "last_assignee":
      return "lastAssignee";
    case "already_pending":
      return "alreadyPending";
    case "not_later":
      return "notLater";
    case "note_required":
      return "noteRequired";
    case "forbidden_assign":
      return "errors.forbiddenAssign";
    case "forbidden":
      return "errors.forbidden";
    case "not_found":
      return "errors.notFound";
    case "assignee_not_found":
      return "errors.assigneeNotFound";
    case "invalid":
      return "errors.invalid";
    case "not_assignee":
      return "errors.notAssignee";
    case "no_deadline":
      return "errors.noDeadline";
    case "not_pending":
      return "errors.notPending";
    case "unavailable":
      return "errors.unavailable";
    default:
      return "errors.generic";
  }
}

// ---------------------------------------------------------------- history

export const HISTORY_KINDS = [
  "created",
  "updated",
  "status_changed",
  "response_submitted",
  "approved",
  "rejected",
  "comment",
  "attachment",
  "assignees_added",
  "assignee_removed",
  "nudged",
  "deadline_requested",
  "deadline_request_approved",
  "deadline_request_rejected",
  "deadline_request_cancelled",
] as const;
export type HistoryKind = (typeof HISTORY_KINDS)[number];

const ACTION_TO_KIND: Record<string, HistoryKind> = {
  "task.created": "created",
  "task.created_for_studio": "created",
  "task.updated": "updated",
  "task.status_changed": "status_changed",
  "task.response_submitted": "response_submitted",
  "task.assignee_approved": "approved",
  "task.assignee_rejected": "rejected",
  "task.comment_added": "comment",
  "task.attachment_added": "attachment",
  "task.assignees_added": "assignees_added",
  "task.assignee_removed": "assignee_removed",
  "task.nudged": "nudged",
  "task.deadline_requested": "deadline_requested",
  "task.deadline_request_approved": "deadline_request_approved",
  "task.deadline_request_rejected": "deadline_request_rejected",
  "task.deadline_request_cancelled": "deadline_request_cancelled",
};

export function historyKindForAction(action: string): HistoryKind | null {
  return ACTION_TO_KIND[action] ?? null;
}

export type HistoryDetails = {
  status?: string | null;
  feedback?: string | null;
  target?: string | null;
  targets?: string[];
  fields?: string[];
  fromDate?: string | null;
  toDate?: string | null;
  note?: string | null;
  reason?: string | null;
  message?: string | null;
};

export type HistoryEvent = {
  id: string;
  at: Date;
  actorName: string | null;
  actorAvatar: string | null;
  kind: HistoryKind;
  details: HistoryDetails;
};

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** User ids referenced by an event that need a name lookup. */
export function historyUserRefs(kind: HistoryKind, newValue: unknown): string[] {
  const nv = obj(newValue);
  switch (kind) {
    case "approved":
    case "rejected":
      return strArr([nv.assigneeUserId]);
    case "assignee_removed":
      return strArr([nv.userId]);
    case "assignees_added":
      return strArr(nv.userIds);
    case "nudged":
      return strArr(nv.to);
    default:
      return [];
  }
}

/** Turns the raw activity_log payload into display details. */
export function historyDetails(
  kind: HistoryKind,
  oldValue: unknown,
  newValue: unknown,
  nameOf: (userId: string) => string | null
): HistoryDetails {
  const ov = obj(oldValue);
  const nv = obj(newValue);
  const names = (ids: string[]) => ids.map((id) => nameOf(id)).filter((n): n is string => !!n);
  switch (kind) {
    case "updated": {
      const fields = Array.from(new Set([...Object.keys(nv), ...Object.keys(ov)]));
      const d: HistoryDetails = { fields };
      if (fields.includes("deadlineDate")) {
        d.fromDate = str(ov.deadlineDate);
        d.toDate = str(nv.deadlineDate);
      }
      return d;
    }
    case "status_changed":
      return { status: str(nv.status) };
    case "approved":
      return { target: str(nv.assigneeUserId) ? nameOf(nv.assigneeUserId as string) : null };
    case "rejected":
      return {
        target: str(nv.assigneeUserId) ? nameOf(nv.assigneeUserId as string) : null,
        feedback: str(nv.feedback),
      };
    case "assignees_added":
      return { targets: names(strArr(nv.userIds)) };
    case "assignee_removed":
      return { targets: names(strArr([nv.userId])) };
    case "nudged":
      return { targets: names(strArr(nv.to)), message: str(nv.message) };
    case "deadline_requested":
      return { fromDate: str(nv.previousDate), toDate: str(nv.requestedDate), reason: str(nv.reason) };
    case "deadline_request_approved":
    case "deadline_request_rejected":
      return { fromDate: str(nv.old), toDate: str(nv.new), note: str(nv.note) };
    default:
      return {};
  }
}
