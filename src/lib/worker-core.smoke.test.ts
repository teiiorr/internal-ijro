import { describe, expect, it } from "vitest";
import {
  addDays,
  classifyAssigneeReminder,
  creatorEscalationKind,
  digestText,
  parseLookbackDays,
  tashkentDateString,
  taskLinkFor,
  taskNotificationTitle,
} from "./tasks/reminder-core";
import {
  EMPTY_METRICS,
  compactAmount,
  isEstimatedMetrics,
  lastCompletedWeekStart,
  metricDelta,
  normalizeMetrics,
  parseWeekParam,
  recentWeekStarts,
  sparklinePath,
  tashkentIsoWeekday,
  weekOptionLabel,
} from "./reports/weekly-brief-core";
import {
  addDaysIso,
  countByStatus,
  dueReminderMessage,
  effectiveStatus,
  emptyCounters,
  overdueReminderMessage,
  parseResolutionFilters,
  sortResolutions,
} from "./councils/resolution-status";

/**
 * Smoke test for the PURE job cores that scripts/worker.ts drives through its
 * four daily jobs (task-reminders, council-resolutions, normative-ack,
 * weekly-snapshot). The worker boots its own DB pool, which we never touch here;
 * this file only asserts that the no-DB logic each job relies on survives the
 * degenerate inputs a real run hits — an empty pass, zero counts, missing dates,
 * a blank query string — without throwing and with the documented empty result.
 */

describe("task-reminders core survives an empty/edge pass", () => {
  it("emits no digest when every counter is zero or negative", () => {
    expect(digestText({ dueToday: 0, overdue: 0, awaitingApproval: 0 })).toBeNull();
    expect(digestText({ dueToday: -1, overdue: 0, awaitingApproval: -3 })).toBeNull();
  });

  it("classifies a far-overdue deadline as nothing (first-run flood guard)", () => {
    const today = "2026-10-05";
    expect(classifyAssigneeReminder(addDays(today, -100), today, 14)).toBeNull();
    expect(creatorEscalationKind(0)).toBeNull();
  });

  it("falls back to the default lookback for blank/invalid env", () => {
    expect(parseLookbackDays(undefined)).toBe(14);
    expect(parseLookbackDays("")).toBe(14);
    expect(parseLookbackDays("-3")).toBe(14);
  });

  it("builds notification title/link without throwing on empty-ish input", () => {
    expect(taskNotificationTitle(null, " ")).toBe("");
    expect(taskLinkFor(null, "")).toBe("/tasks/");
    const long = taskNotificationTitle(undefined, "x".repeat(500));
    expect(Array.from(long).length).toBeLessThanOrEqual(255);
    expect(tashkentDateString(new Date(0))).toBe("1970-01-01");
  });
});

describe("weekly-snapshot core survives an empty/edge pass", () => {
  it("normalizes absent/garbage metrics to the zeroed shape", () => {
    expect(normalizeMetrics(null)).toEqual(EMPTY_METRICS);
    expect(normalizeMetrics(undefined)).toEqual(EMPTY_METRICS);
    expect(normalizeMetrics("not json")).toEqual(EMPTY_METRICS);
    expect(isEstimatedMetrics(null)).toBe(false);
  });

  it("returns null deltas/sparklines when there is nothing to compare", () => {
    expect(metricDelta(5, null, "down")).toBeNull();
    expect(sparklinePath([], 100, 28)).toBeNull();
    expect(sparklinePath([7], 100, 28)).toBeNull();
    expect(recentWeekStarts("2026-09-28", 0)).toEqual([]);
    expect(compactAmount(0)).toEqual({ n: "0", unit: null });
  });

  it("resolves the week window deterministically for a fixed Monday", () => {
    const monday = new Date("2026-10-05T08:00:00+05:00");
    expect(tashkentIsoWeekday(monday)).toBe(1);
    const ws = lastCompletedWeekStart(monday);
    expect(ws).toBe("2026-09-28");
    expect(parseWeekParam(undefined, monday)).toBe(ws);
    expect(weekOptionLabel(ws)).toBe("28.09 - 04.10");
  });
});

describe("council-resolutions core survives an empty/edge pass", () => {
  it("counts an empty resolution set as all-zero", () => {
    expect(countByStatus([])).toEqual(emptyCounters());
    expect(sortResolutions([])).toEqual([]);
  });

  it("treats an undated open point as open and shifts dates cleanly", () => {
    expect(effectiveStatus({ status: "open", dueDate: null, taskStatus: null }, "2026-10-05")).toBe("open");
    expect(addDaysIso("2026-10-05", 0)).toBe("2026-10-05");
  });

  it("builds reminder messages without throwing on degenerate inputs", () => {
    expect(dueReminderMessage(0)).toContain("№0");
    expect(overdueReminderMessage(0, "")).toContain("№0");
  });

  it("defaults the ?mine filter from position when the query string is blank", () => {
    const none = (_key: string): string | null => null;
    const f = parseResolutionFilters(none, "mutaxassis");
    expect(f.mine).toBe(true);
    expect(f.kind).toBeUndefined();
    expect(f.status).toBeUndefined();
    expect(f.responsibleId).toBeUndefined();
    expect(f.departmentId).toBeUndefined();
  });
});
