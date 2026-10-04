import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  canCancelResolution,
  canCloseResolution,
  canDeleteResolution,
  canSendResolutionAsTask,
  carryoverTopic,
  countByStatus,
  ddmmyyyy,
  defaultMine,
  effectiveStatus,
  isValidIsoDate,
  overdueReminderMessage,
  dueReminderMessage,
  parseResolutionFilters,
  resolutionTaskDescription,
  resolutionTaskTitle,
  resolutionsHref,
  rowPermissions,
  sortResolutions,
  taskDeadlineFromDue,
  tashkentToday,
  type EffectiveStatus,
} from "./resolution-status";

const TODAY = "2026-10-05";

describe("effectiveStatus", () => {
  const base = { status: "open", dueDate: null as string | null, taskStatus: null as string | null };

  it("cancelled wins over everything", () => {
    expect(effectiveStatus({ ...base, status: "cancelled", taskStatus: "completed" }, TODAY)).toBe("cancelled");
    expect(effectiveStatus({ ...base, status: "cancelled", dueDate: "2026-01-01" }, TODAY)).toBe("cancelled");
  });

  it("done when manually closed or the linked task is completed", () => {
    expect(effectiveStatus({ ...base, status: "done" }, TODAY)).toBe("done");
    expect(effectiveStatus({ ...base, status: "done", dueDate: "2026-01-01" }, TODAY)).toBe("done");
    expect(effectiveStatus({ ...base, taskStatus: "completed", dueDate: "2026-01-01" }, TODAY)).toBe("done");
  });

  it("a linked task that is not completed does not close the point", () => {
    expect(effectiveStatus({ ...base, taskStatus: "under_review", dueDate: "2026-10-04" }, TODAY)).toBe("overdue");
    expect(effectiveStatus({ ...base, taskStatus: "in_progress" }, TODAY)).toBe("open");
  });

  it("overdue only when the due date is before today", () => {
    expect(effectiveStatus({ ...base, dueDate: "2026-10-04" }, TODAY)).toBe("overdue");
    expect(effectiveStatus({ ...base, dueDate: TODAY }, TODAY)).toBe("due_soon");
  });

  it("due_soon up to and including today + 3", () => {
    expect(effectiveStatus({ ...base, dueDate: "2026-10-08" }, TODAY)).toBe("due_soon");
    expect(effectiveStatus({ ...base, dueDate: "2026-10-09" }, TODAY)).toBe("open");
  });

  it("no due date → open", () => {
    expect(effectiveStatus(base, TODAY)).toBe("open");
  });

  it("handles month / year boundaries", () => {
    expect(effectiveStatus({ ...base, dueDate: "2027-01-02" }, "2026-12-30")).toBe("due_soon");
    expect(effectiveStatus({ ...base, dueDate: "2026-12-31" }, "2027-01-01")).toBe("overdue");
  });
});

describe("date helpers", () => {
  it("addDaysIso", () => {
    expect(addDaysIso("2026-10-05", 3)).toBe("2026-10-08");
    expect(addDaysIso("2026-02-27", 2)).toBe("2026-03-01");
    expect(addDaysIso("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("tashkentToday shifts UTC by +05:00", () => {
    expect(tashkentToday(new Date("2026-10-05T18:59:59Z"))).toBe("2026-10-05");
    expect(tashkentToday(new Date("2026-10-05T19:00:00Z"))).toBe("2026-10-06");
  });

  it("ddmmyyyy", () => {
    expect(ddmmyyyy("2026-09-12")).toBe("12.09.2026");
    expect(ddmmyyyy("2026-09-12T10:00:00Z")).toBe("12.09.2026");
    expect(ddmmyyyy(null)).toBe("");
    expect(ddmmyyyy("garbage")).toBe("");
  });

  it("isValidIsoDate rejects impossible dates", () => {
    expect(isValidIsoDate("2026-02-28")).toBe(true);
    expect(isValidIsoDate("2026-02-31")).toBe(false);
    expect(isValidIsoDate("2026-2-3")).toBe(false);
    expect(isValidIsoDate(null)).toBe(false);
  });

  it("taskDeadlineFromDue", () => {
    expect(taskDeadlineFromDue("2026-10-20")).toBe("2026-10-20T00:00:00.000Z");
  });
});

describe("generated texts", () => {
  it("task title is prefixed and capped at 500 chars", () => {
    expect(resolutionTaskTitle(3, "  Smetani qayta koʻrib chiqish ")).toBe("Kengash qarori №3: Smetani qayta koʻrib chiqish");
    expect(resolutionTaskTitle(1, "x".repeat(1000))).toHaveLength(500);
  });

  it("task description carries the council and the meeting date", () => {
    expect(resolutionTaskDescription("Matn", "smeta", "2026-09-12")).toBe("Matn\n\nSmeta komissiyasi majlisi, 12.09.2026");
    expect(resolutionTaskDescription("Matn", "ekspert", "2026-09-12")).toBe("Matn\n\nEkspertlar Kengashi majlisi, 12.09.2026");
  });

  it("carry-over agenda topic", () => {
    expect(carryoverTopic(3, "2026-09-12")).toBe("№3-qaror ijrosi toʻgʻrisida (12.09.2026 majlisi)");
  });

  it("reminder messages are bilingual", () => {
    expect(dueReminderMessage(2)).toContain("№2");
    expect(dueReminderMessage(2)).toContain("через 3 дня");
    expect(overdueReminderMessage(4, "2026-10-01")).toContain("01.10.2026");
  });
});

describe("counters and sorting", () => {
  type R = { effective: EffectiveStatus; dueDate: string | null; meetingDate: string; number: number; id: string };
  const rows: R[] = [
    { id: "done", effective: "done", dueDate: "2026-09-01", meetingDate: "2026-08-01", number: 1 },
    { id: "open-late", effective: "open", dueDate: "2026-12-01", meetingDate: "2026-09-01", number: 2 },
    { id: "open-nodue", effective: "open", dueDate: null, meetingDate: "2026-09-01", number: 1 },
    { id: "overdue", effective: "overdue", dueDate: "2026-09-20", meetingDate: "2026-09-01", number: 3 },
    { id: "soon", effective: "due_soon", dueDate: "2026-10-06", meetingDate: "2026-09-01", number: 4 },
    { id: "cancelled", effective: "cancelled", dueDate: null, meetingDate: "2026-09-10", number: 5 },
    { id: "open-early", effective: "open", dueDate: "2026-11-01", meetingDate: "2026-09-01", number: 6 },
  ];

  it("countByStatus", () => {
    expect(countByStatus(rows)).toEqual({ open: 3, due_soon: 1, overdue: 1, done: 1, cancelled: 1 });
  });

  it("sortResolutions: urgency first, undated last, closed at the end", () => {
    expect(sortResolutions(rows).map((r) => r.id)).toEqual([
      "overdue",
      "soon",
      "open-early",
      "open-late",
      "open-nodue",
      "done",
      "cancelled",
    ]);
  });
});

describe("permissions", () => {
  const me = { id: "u1", position: "mutaxassis" };
  const director = { id: "d1", position: "direktor" };
  const open = { status: "open", effective: "open" as EffectiveStatus, taskId: null, responsibleUserId: "u1" };

  it("responsible user may close an untasked open point", () => {
    expect(canCloseResolution(open, me, false)).toBe(true);
    expect(canCloseResolution({ ...open, responsibleUserId: "u2" }, me, false)).toBe(false);
    expect(canCloseResolution({ ...open, responsibleUserId: "u2" }, me, true)).toBe(true);
  });

  it("a tasked point closes by hand only for direktor", () => {
    const tasked = { ...open, taskId: "t1" };
    expect(canCloseResolution(tasked, me, true)).toBe(false);
    expect(canCloseResolution(tasked, director, true)).toBe(true);
  });

  it("closed or cancelled points cannot be closed again", () => {
    expect(canCloseResolution({ ...open, status: "done", effective: "done" }, me, true)).toBe(false);
    expect(canCloseResolution({ ...open, effective: "done" }, director, true)).toBe(false);
    expect(canCloseResolution({ ...open, status: "cancelled", effective: "cancelled" }, me, true)).toBe(false);
  });

  it("send as task needs edit + assign rights and an untasked open point", () => {
    expect(canSendResolutionAsTask(open, true, true)).toBe(true);
    expect(canSendResolutionAsTask(open, true, false)).toBe(false);
    expect(canSendResolutionAsTask(open, false, true)).toBe(false);
    expect(canSendResolutionAsTask({ ...open, taskId: "t1" }, true, true)).toBe(false);
    expect(canSendResolutionAsTask({ ...open, status: "cancelled", effective: "cancelled" }, true, true)).toBe(false);
  });

  it("rowPermissions bundles every flag", () => {
    expect(rowPermissions(open, me, false, false)).toEqual({
      canEdit: false,
      canClose: true,
      canSend: false,
      canCancel: false,
      canDelete: false,
    });
    expect(rowPermissions({ ...open, taskId: "t1" }, director, true, true)).toEqual({
      canEdit: true,
      canClose: true,
      canSend: false,
      canCancel: true,
      canDelete: false,
    });
  });

  it("delete only without a task; cancel only while active", () => {
    expect(canDeleteResolution({ taskId: null }, true)).toBe(true);
    expect(canDeleteResolution({ taskId: "t1" }, true)).toBe(false);
    expect(canDeleteResolution({ taskId: null }, false)).toBe(false);
    expect(canCancelResolution(open, true)).toBe(true);
    expect(canCancelResolution({ ...open, effective: "overdue" }, true)).toBe(true);
    expect(canCancelResolution({ ...open, status: "done", effective: "done" }, true)).toBe(false);
  });
});

describe("filters", () => {
  const uuid = "123e4567-e89b-12d3-a456-426614174000";
  const from = (o: Record<string, string>) => (k: string) => o[k];

  it("defaultMine for specialists only", () => {
    expect(defaultMine("mutaxassis")).toBe(true);
    expect(defaultMine("yetakchi_mutaxassis")).toBe(true);
    expect(defaultMine("bosh_mutaxassis")).toBe(true);
    expect(defaultMine("koordinator")).toBe(false);
    expect(defaultMine("direktor")).toBe(false);
  });

  it("parses and validates", () => {
    expect(parseResolutionFilters(from({ kind: "smeta", status: "overdue", responsible: uuid, department: "x" }), "direktor")).toEqual({
      kind: "smeta",
      status: "overdue",
      responsibleId: uuid,
      departmentId: undefined,
      mine: false,
    });
    expect(parseResolutionFilters(from({ kind: "bad", status: "bad" }), "mutaxassis")).toEqual({
      kind: undefined,
      status: undefined,
      responsibleId: undefined,
      departmentId: undefined,
      mine: true,
    });
    expect(parseResolutionFilters(from({ mine: "0" }), "mutaxassis").mine).toBe(false);
    expect(parseResolutionFilters(from({ mine: "1" }), "direktor").mine).toBe(true);
  });

  it("href round-trips through the parser", () => {
    const f = { kind: "ekspert" as const, status: "due_soon" as const, departmentId: uuid, mine: false };
    const href = resolutionsHref(f, "/kengashlar/ijro", "mutaxassis");
    expect(href).toBe(`/kengashlar/ijro?kind=ekspert&status=due_soon&department=${uuid}&mine=0`);
    const qs = new URLSearchParams(href.split("?")[1]);
    expect(parseResolutionFilters((k) => qs.get(k), "mutaxassis")).toEqual({ ...f, responsibleId: undefined });
  });

  it("mine overrides the responsible filter and default mine is omitted", () => {
    expect(resolutionsHref({ mine: true, responsibleId: uuid }, "/x", "mutaxassis")).toBe("/x");
    expect(resolutionsHref({ mine: true }, "/x", "direktor")).toBe("/x?mine=1");
    expect(resolutionsHref({ mine: false }, "/x", "direktor")).toBe("/x");
  });
});
