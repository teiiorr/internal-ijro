import { describe, expect, it } from "vitest";
import {
  HISTORY_KINDS,
  addDaysIso,
  approvalMovesDeadline,
  buildTaskDiff,
  canManageTask,
  diffDaysIso,
  errorMessageKey,
  extensionDateError,
  fmtDdMm,
  historyDetails,
  historyKindForAction,
  historyUserRefs,
  isIsoDate,
  isOpenAssigneeStatus,
  isoToDeadline,
  minExtensionDate,
  normalizeDescription,
  removalBlocker,
  toTashkentIso,
  touchesLockedFields,
  type EditableTaskFields,
} from "./task-edit-logic";

describe("dates (Tashkent, UTC+5)", () => {
  it("maps late-evening UTC instants to the next Tashkent day", () => {
    expect(toTashkentIso(new Date("2026-10-09T18:59:00Z"))).toBe("2026-10-09");
    expect(toTashkentIso(new Date("2026-10-09T19:00:00Z"))).toBe("2026-10-10");
  });
  it("round-trips the date-only storage convention", () => {
    const d = isoToDeadline("2026-10-17");
    expect(d.toISOString()).toBe("2026-10-17T00:00:00.000Z");
    expect(toTashkentIso(d)).toBe("2026-10-17");
  });
  it("adds and diffs calendar days across month/year ends", () => {
    expect(addDaysIso("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(diffDaysIso("2026-10-10", "2026-10-17")).toBe(7);
    expect(diffDaysIso("2026-10-17", "2026-10-10")).toBe(-7);
  });
  it("validates ISO dates strictly", () => {
    expect(isIsoDate("2026-10-17")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("17.10.2026")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });
  it("formats dd.mm", () => {
    expect(fmtDdMm("2026-10-07")).toBe("07.10");
    expect(fmtDdMm(null)).toBe("—");
  });
});

describe("permissions", () => {
  const task = { createdByUserId: "creator" };
  it("creator, direktor and orinbosar can manage", () => {
    expect(canManageTask({ id: "creator", position: "mutaxassis" }, task)).toBe(true);
    expect(canManageTask({ id: "x", position: "direktor" }, task)).toBe(true);
    expect(canManageTask({ id: "x", position: "orinbosar" }, task)).toBe(true);
  });
  it("others cannot", () => {
    expect(canManageTask({ id: "x", position: "bolim_boshligi" }, task)).toBe(false);
    expect(canManageTask({ id: "x", position: "koordinator" }, task)).toBe(false);
  });
  it("open assignee statuses", () => {
    expect(isOpenAssigneeStatus("todo")).toBe(true);
    expect(isOpenAssigneeStatus("in_progress")).toBe(true);
    expect(isOpenAssigneeStatus("rejected")).toBe(true);
    expect(isOpenAssigneeStatus("under_review")).toBe(false);
    expect(isOpenAssigneeStatus("completed")).toBe(false);
  });
});

describe("removalBlocker", () => {
  it("blocks assignees who already responded", () => {
    expect(removalBlocker({ status: "in_progress", responseSubmittedAt: new Date() }, 3)).toBe("assignee_has_response");
    expect(removalBlocker({ status: "under_review", responseSubmittedAt: null }, 3)).toBe("assignee_has_response");
    expect(removalBlocker({ status: "completed", responseSubmittedAt: null }, 3)).toBe("assignee_has_response");
  });
  it("keeps at least one assignee", () => {
    expect(removalBlocker({ status: "in_progress", responseSubmittedAt: null }, 1)).toBe("last_assignee");
  });
  it("allows removing an untouched assignee", () => {
    expect(removalBlocker({ status: "todo", responseSubmittedAt: null }, 2)).toBeNull();
  });
});

describe("buildTaskDiff", () => {
  const base: EditableTaskFields = { title: "Hisobot", description: "Matn", priority: "medium", deadlineDate: "2026-10-10" };

  it("returns an empty diff when nothing changed (whitespace ignored)", () => {
    const d = buildTaskDiff(base, { ...base, title: "  Hisobot ", description: "Matn  " });
    expect(d.changed).toEqual([]);
  });
  it("records old and new values of a deadline change", () => {
    const d = buildTaskDiff(base, { ...base, deadlineDate: "2026-10-17" });
    expect(d.changed).toEqual(["deadlineDate"]);
    expect(d.old).toEqual({ deadlineDate: "2026-10-10" });
    expect(d.next).toEqual({ deadlineDate: "2026-10-17" });
    expect(touchesLockedFields(d)).toBe(true);
  });
  it("treats an emptied description as NULL", () => {
    const d = buildTaskDiff(base, { ...base, description: "   " });
    expect(d.changed).toEqual(["description"]);
    expect(d.next.description).toBeNull();
    expect(touchesLockedFields(d)).toBe(false);
  });
  it("detects removing the deadline", () => {
    const d = buildTaskDiff(base, { ...base, deadlineDate: null });
    expect(d.next).toEqual({ deadlineDate: null });
  });
  it("normalizes descriptions", () => {
    expect(normalizeDescription(null)).toBeNull();
    expect(normalizeDescription("  ")).toBeNull();
    expect(normalizeDescription(" a ")).toBe("a");
  });
});

describe("extension requests", () => {
  it("requires a deadline", () => {
    expect(extensionDateError("2026-10-20", null, "2026-10-05")).toBe("no_deadline");
  });
  it("requires a later date than the current deadline", () => {
    expect(extensionDateError("2026-10-10", "2026-10-10", "2026-10-05")).toBe("not_later");
    expect(extensionDateError("2026-10-09", "2026-10-10", "2026-10-05")).toBe("not_later");
    expect(extensionDateError("2026-10-11", "2026-10-10", "2026-10-05")).toBeNull();
  });
  it("never accepts a date in the past (overdue tasks)", () => {
    expect(extensionDateError("2026-10-03", "2026-10-01", "2026-10-05")).toBe("not_later");
    expect(extensionDateError("2026-10-05", "2026-10-01", "2026-10-05")).toBeNull();
  });
  it("rejects malformed dates", () => {
    expect(extensionDateError("2026-13-40", "2026-10-01", "2026-10-05")).toBe("not_later");
  });
  it("computes the earliest selectable date", () => {
    expect(minExtensionDate("2026-10-10", "2026-10-05")).toBe("2026-10-11");
    expect(minExtensionDate("2026-10-01", "2026-10-05")).toBe("2026-10-05");
  });
});

describe("history mapping", () => {
  it("maps every known action to a kind", () => {
    expect(historyKindForAction("task.created")).toBe("created");
    expect(historyKindForAction("task.created_for_studio")).toBe("created");
    expect(historyKindForAction("task.assignee_rejected")).toBe("rejected");
    expect(historyKindForAction("task.comment_added")).toBe("comment");
    expect(historyKindForAction("task.nudged")).toBe("nudged");
    expect(historyKindForAction("task.deadline_request_approved")).toBe("deadline_request_approved");
    expect(historyKindForAction("project.updated")).toBeNull();
    expect(HISTORY_KINDS).toHaveLength(15);
  });
  it("surfaces rejection feedback and the reviewed assignee", () => {
    const names = new Map([["u1", "Valiyev Akmal"]]);
    const d = historyDetails("rejected", null, { assigneeUserId: "u1", feedback: "Jadval toʻliq emas" }, (id) => names.get(id) ?? null);
    expect(d).toEqual({ target: "Valiyev Akmal", feedback: "Jadval toʻliq emas" });
    expect(historyUserRefs("rejected", { assigneeUserId: "u1" })).toEqual(["u1"]);
  });
  it("lists changed fields and the deadline shift of an edit", () => {
    const d = historyDetails("updated", { deadlineDate: "2026-10-10", title: "A" }, { deadlineDate: "2026-10-17", title: "B" }, () => null);
    expect(d.fields).toEqual(["deadlineDate", "title"]);
    expect(d.fromDate).toBe("2026-10-10");
    expect(d.toDate).toBe("2026-10-17");
  });
  it("resolves added / removed / nudged people", () => {
    const nameOf = (id: string) => ({ a: "A", b: "B" })[id] ?? null;
    expect(historyDetails("assignees_added", null, { userIds: ["a", "b", "zz"] }, nameOf).targets).toEqual(["A", "B"]);
    expect(historyDetails("assignee_removed", null, { userId: "b" }, nameOf).targets).toEqual(["B"]);
    expect(historyUserRefs("nudged", { to: ["a"], message: null })).toEqual(["a"]);
  });
  it("tolerates malformed payloads", () => {
    expect(historyDetails("status_changed", null, null, () => null)).toEqual({ status: null });
    expect(historyUserRefs("assignees_added", { userIds: "nope" })).toEqual([]);
    expect(historyDetails("deadline_request_rejected", null, { old: "2026-10-10", new: "2026-10-15", note: "Yoʻq" }, () => null)).toEqual({
      fromDate: "2026-10-10",
      toDate: "2026-10-15",
      note: "Yoʻq",
    });
  });
});

describe("errorMessageKey", () => {
  it("maps codes to i18n keys and falls back to a generic message", () => {
    expect(errorMessageKey("task_completed")).toBe("completedOnlyDescription");
    expect(errorMessageKey("already_pending")).toBe("alreadyPending");
    expect(errorMessageKey("forbidden_assign")).toBe("errors.forbiddenAssign");
    expect(errorMessageKey("something_else")).toBe("errors.generic");
  });
});

describe("approvalMovesDeadline", () => {
  it("moves a later or missing deadline, never shortens", () => {
    expect(approvalMovesDeadline("2026-10-10", "2026-10-17")).toBe(true);
    expect(approvalMovesDeadline(null, "2026-10-17")).toBe(true);
    // Another request already pushed the deadline to 20.10 — approving 15.10 must not pull it back.
    expect(approvalMovesDeadline("2026-10-20", "2026-10-15")).toBe(false);
    expect(approvalMovesDeadline("2026-10-17", "2026-10-17")).toBe(false);
  });
});
