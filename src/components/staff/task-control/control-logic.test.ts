import { describe, expect, it } from "vitest";
import {
  allowedScopesFor,
  chipRingColor,
  clampExportRange,
  controlHref,
  isNudgeThrottled,
  laggingAssigneeIds,
  lateDays,
  parseFilter,
  parseIsoDate,
  parsePage,
  parsePriority,
  parseUuid,
  resolveScope,
  tashkentDate,
  NUDGE_THROTTLE_MS,
} from "./control-logic";

describe("allowedScopesFor / resolveScope", () => {
  it("gives every staff member 'mine' only by default", () => {
    expect(allowedScopesFor("mutaxassis", "d1")).toEqual(["mine"]);
    expect(allowedScopesFor("hr", null)).toEqual(["mine"]);
  });

  it("gives heads with a department and coordinators the department scope", () => {
    expect(allowedScopesFor("bolim_boshligi", "d1")).toEqual(["mine", "department"]);
    expect(allowedScopesFor("bolim_boshligi", null)).toEqual(["mine"]);
    expect(allowedScopesFor("koordinator", null)).toEqual(["mine", "department"]);
  });

  it("gives direktor and orinbosar the whole-centre scope", () => {
    expect(allowedScopesFor("direktor", null)).toEqual(["mine", "all"]);
    expect(allowedScopesFor("orinbosar", "d1")).toEqual(["mine", "all"]);
  });

  it("silently falls back to 'mine' for a scope the user may not use", () => {
    const mutaxassis = allowedScopesFor("mutaxassis", "d1");
    expect(resolveScope("all", mutaxassis)).toBe("mine");
    expect(resolveScope("department", mutaxassis)).toBe("mine");
    expect(resolveScope("garbage", mutaxassis)).toBe("mine");
    expect(resolveScope(undefined, mutaxassis)).toBe("mine");
    expect(resolveScope("department", allowedScopesFor("bolim_boshligi", "d1"))).toBe("department");
    expect(resolveScope("all", allowedScopesFor("direktor", null))).toBe("all");
  });
});

describe("search-param parsing", () => {
  it("accepts only known filters / priorities", () => {
    expect(parseFilter("late")).toBe("late");
    expect(parseFilter("no_response")).toBe("no_response");
    expect(parseFilter("to_review")).toBe("to_review");
    expect(parseFilter("everything")).toBeUndefined();
    expect(parsePriority("urgent")).toBe("urgent");
    expect(parsePriority("critical")).toBeUndefined();
  });

  it("accepts only real YYYY-MM-DD dates", () => {
    expect(parseIsoDate("2026-10-05")).toBe("2026-10-05");
    expect(parseIsoDate("2026-02-30")).toBeUndefined();
    expect(parseIsoDate("05.10.2026")).toBeUndefined();
    expect(parseIsoDate("2026-10-05'; drop table tasks;--")).toBeUndefined();
  });

  it("validates uuids and pages", () => {
    expect(parseUuid("0b9e7a52-3f0a-4c1e-9d1b-2a7f5e6c8d90")).toBe("0b9e7a52-3f0a-4c1e-9d1b-2a7f5e6c8d90");
    expect(parseUuid("not-a-uuid")).toBeUndefined();
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });
});

describe("tashkentDate", () => {
  it("shifts UTC instants into the Tashkent calendar day", () => {
    expect(tashkentDate("2026-10-04T19:30:00Z")).toBe("2026-10-05");
    expect(tashkentDate("2026-10-04T18:59:59Z")).toBe("2026-10-04");
    expect(tashkentDate(new Date("2026-10-05T00:00:00+05:00"))).toBe("2026-10-05");
  });
});

describe("clampExportRange", () => {
  const today = "2026-10-05";

  it("defaults to ±90 days around today", () => {
    expect(clampExportRange(undefined, undefined, today)).toEqual({ from: "2026-07-07", to: "2027-01-03" });
  });

  it("swaps an inverted range", () => {
    expect(clampExportRange("2026-10-31", "2026-10-01", today)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });

  it("clamps the span to 366 days", () => {
    expect(clampExportRange("2020-01-01", "2026-10-05", today)).toEqual({ from: "2025-10-04", to: "2026-10-05" });
    expect(clampExportRange("2026-01-01", undefined, today)).toEqual({ from: "2026-01-01", to: "2027-01-02" });
    expect(clampExportRange(undefined, "2026-10-05", today)).toEqual({ from: "2025-10-04", to: "2026-10-05" });
  });

  it("ignores malformed dates", () => {
    expect(clampExportRange("x", "y", today)).toEqual({ from: "2026-07-07", to: "2027-01-03" });
  });
});

describe("lateDays", () => {
  const today = "2026-10-05";
  // Deadline: 1 Oct 2026, 18:00 Tashkent.
  const deadline = "2026-10-01T13:00:00Z";

  it("is null without a deadline", () => {
    expect(lateDays({ deadline: null, status: "todo", responseSubmittedAt: null, completedAt: null }, today)).toBeNull();
  });

  it("counts open assignees against today", () => {
    expect(lateDays({ deadline, status: "in_progress", responseSubmittedAt: null, completedAt: null }, today)).toBe(4);
    expect(lateDays({ deadline, status: "rejected", responseSubmittedAt: "2026-09-30T10:00:00Z", completedAt: null }, today)).toBe(4);
  });

  it("measures answered assignees at their response time", () => {
    expect(lateDays({ deadline, status: "under_review", responseSubmittedAt: "2026-10-03T08:00:00Z", completedAt: null }, today)).toBe(2);
    // Same Tashkent day as the deadline → not late.
    expect(lateDays({ deadline, status: "completed", responseSubmittedAt: "2026-10-01T18:30:00Z", completedAt: "2026-10-04T08:00:00Z" }, today)).toBe(0);
    // No response recorded → completion time.
    expect(lateDays({ deadline, status: "completed", responseSubmittedAt: null, completedAt: "2026-10-04T08:00:00Z" }, today)).toBe(3);
  });

  it("never goes negative", () => {
    expect(lateDays({ deadline: "2026-12-31T13:00:00Z", status: "todo", responseSubmittedAt: null, completedAt: null }, today)).toBe(0);
  });
});

describe("nudge throttling", () => {
  const now = Date.parse("2026-10-05T12:00:00Z");

  it("throttles within 24h only", () => {
    expect(isNudgeThrottled(null, now)).toBe(false);
    expect(isNudgeThrottled(new Date(now - NUDGE_THROTTLE_MS + 60_000).toISOString(), now)).toBe(true);
    expect(isNudgeThrottled(new Date(now - NUDGE_THROTTLE_MS - 60_000).toISOString(), now)).toBe(false);
  });

  it("preselects open, not-recently-nudged assignees", () => {
    const ids = laggingAssigneeIds(
      [
        { userId: "a", status: "todo", lastNudgeAt: null },
        { userId: "b", status: "in_progress", lastNudgeAt: new Date(now - 3_600_000).toISOString() },
        { userId: "c", status: "under_review", lastNudgeAt: null },
        { userId: "d", status: "completed", lastNudgeAt: null },
        { userId: "e", status: "rejected", lastNudgeAt: new Date(now - 2 * NUDGE_THROTTLE_MS).toISOString() },
      ],
      now
    );
    expect(ids).toEqual(["a", "e"]);
  });
});

describe("presentation helpers", () => {
  it("maps statuses to ring colours", () => {
    expect(chipRingColor("todo")).toBe("var(--primary)");
    expect(chipRingColor("in_progress")).toBe("var(--primary)");
    expect(chipRingColor("under_review")).toBe("var(--warning)");
    expect(chipRingColor("completed")).toBe("var(--success)");
    expect(chipRingColor("rejected")).toBe("var(--danger)");
  });

  it("builds clean board URLs", () => {
    expect(controlHref({})).toBe("/tasks/control");
    expect(controlHref({ scope: "all", filter: "late", projectId: null, page: 2, to: "" })).toBe("/tasks/control?scope=all&filter=late&page=2");
    expect(controlHref({ scope: "mine" }, "/api/export/task-control")).toBe("/api/export/task-control?scope=mine");
  });
});
