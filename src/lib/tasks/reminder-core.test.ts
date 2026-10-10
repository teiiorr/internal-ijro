import { describe, expect, it } from "vitest";
import {
  addDays,
  assigneeReminderMessage,
  classifyAssigneeReminder,
  creatorEscalationKind,
  daysBetween,
  digestText,
  escalationMessage,
  parseLookbackDays,
  tashkentDateString,
  taskLinkFor,
  taskNotificationTitle,
} from "./reminder-core";

describe("tashkentDateString", () => {
  it("stays on the same date before 19:00 UTC", () => {
    expect(tashkentDateString(new Date("2026-10-05T18:59:59.999Z"))).toBe("2026-10-05");
  });

  it("rolls over to the next date at 19:00 UTC (00:00 Tashkent)", () => {
    expect(tashkentDateString(new Date("2026-10-05T19:00:00.000Z"))).toBe("2026-10-06");
  });

  it("handles month and year boundaries", () => {
    expect(tashkentDateString(new Date("2026-10-31T19:30:00Z"))).toBe("2026-11-01");
    expect(tashkentDateString(new Date("2026-12-31T20:00:00Z"))).toBe("2027-01-01");
  });

  it("treats 03:00 Tashkent (22:00 UTC previous day) as the Tashkent date", () => {
    // 05:00 Tashkent = 00:00 UTC same day — the classic 'overdue at 05:00' bug.
    expect(tashkentDateString(new Date("2026-10-05T00:00:00Z"))).toBe("2026-10-05");
    expect(tashkentDateString(new Date("2026-10-04T22:00:00Z"))).toBe("2026-10-05");
  });
});

describe("addDays / daysBetween", () => {
  it("adds and subtracts calendar days across boundaries", () => {
    expect(addDays("2026-10-05", 1)).toBe("2026-10-06");
    expect(addDays("2026-10-05", -5)).toBe("2026-09-30");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-10-05", 0)).toBe("2026-10-05");
  });

  it("counts whole days in either direction", () => {
    expect(daysBetween("2026-10-05", "2026-10-05")).toBe(0);
    expect(daysBetween("2026-10-04", "2026-10-05")).toBe(1);
    expect(daysBetween("2026-10-05", "2026-10-04")).toBe(-1);
    expect(daysBetween("2026-09-20", "2026-10-05")).toBe(15);
    expect(daysBetween("2026-12-31", "2027-01-02")).toBe(2);
  });
});

describe("classifyAssigneeReminder", () => {
  const today = "2026-10-05";
  const lookback = 14;

  it("+1 day → due_tomorrow", () => {
    expect(classifyAssigneeReminder(addDays(today, 1), today, lookback)).toBe("due_tomorrow");
  });

  it("0 → due_today", () => {
    expect(classifyAssigneeReminder(today, today, lookback)).toBe("due_today");
  });

  it("-1 → overdue_assignee", () => {
    expect(classifyAssigneeReminder(addDays(today, -1), today, lookback)).toBe("overdue_assignee");
  });

  it("-lookback → overdue_assignee (inclusive)", () => {
    expect(classifyAssigneeReminder(addDays(today, -lookback), today, lookback)).toBe("overdue_assignee");
  });

  it("-lookback-1 → null (first-run flood guard)", () => {
    expect(classifyAssigneeReminder(addDays(today, -lookback - 1), today, lookback)).toBeNull();
  });

  it("+2 and further → null", () => {
    expect(classifyAssigneeReminder(addDays(today, 2), today, lookback)).toBeNull();
    expect(classifyAssigneeReminder(addDays(today, 30), today, lookback)).toBeNull();
  });

  it("lookback 0 disables overdue reminders", () => {
    expect(classifyAssigneeReminder(addDays(today, -1), today, 0)).toBeNull();
    expect(classifyAssigneeReminder(today, today, 0)).toBe("due_today");
  });

  it("uses Tashkent dates: a deadline at 23:00 Tashkent is due that day, not the next", () => {
    // Deadline 2026-10-05 23:00 Tashkent = 18:00 UTC; worker runs 08:00 Tashkent = 03:00 UTC.
    const dl = tashkentDateString(new Date("2026-10-05T18:00:00Z"));
    const now = tashkentDateString(new Date("2026-10-05T03:00:00Z"));
    expect(classifyAssigneeReminder(dl, now, lookback)).toBe("due_today");
  });
});

describe("creatorEscalationKind", () => {
  it("not yet overdue → null", () => {
    expect(creatorEscalationKind(0)).toBeNull();
    expect(creatorEscalationKind(-1)).toBeNull();
  });

  it("day 1 and day 2 → d1", () => {
    expect(creatorEscalationKind(1)).toBe("overdue_creator_d1");
    expect(creatorEscalationKind(2)).toBe("overdue_creator_d1");
  });

  it("day 3 and later → d3 (a first run on a 5-day-old task sends only d3)", () => {
    expect(creatorEscalationKind(3)).toBe("overdue_creator_d3");
    expect(creatorEscalationKind(5)).toBe("overdue_creator_d3");
    expect(creatorEscalationKind(14)).toBe("overdue_creator_d3");
  });
});

describe("digestText", () => {
  it("returns null when all counts are zero", () => {
    expect(digestText({ dueToday: 0, overdue: 0, awaitingApproval: 0 })).toBeNull();
  });

  it("returns bilingual title and message with all three counts", () => {
    const d = digestText({ dueToday: 2, overdue: 1, awaitingApproval: 3 });
    expect(d).not.toBeNull();
    expect(d!.title).toBe("Ertalabki xulosa / Утренняя сводка");
    expect(d!.message).toBe(
      "Bugun muddati: 2, Kechikkan: 1, Tasdiqlashingizni kutmoqda: 3 / Сегодня срок: 2, Просрочено: 1, Ждут вашего утверждения: 3"
    );
  });

  it("is sent when only one count is non-zero", () => {
    expect(digestText({ dueToday: 0, overdue: 0, awaitingApproval: 1 })).not.toBeNull();
    expect(digestText({ dueToday: 0, overdue: 4, awaitingApproval: 0 })).not.toBeNull();
  });
});

describe("message helpers", () => {
  it("assignee messages are bilingual", () => {
    expect(assigneeReminderMessage("due_tomorrow")).toBe("Muddat ertaga / Срок завтра");
    expect(assigneeReminderMessage("due_today")).toBe("Muddat bugun / Срок сегодня");
    expect(assigneeReminderMessage("overdue_assignee")).toBe("Muddat oʻtdi / Срок истёк");
  });

  it("escalation message lists late of total", () => {
    expect(escalationMessage(3, 2)).toBe("3 ijrochidan 2 nafari kechikmoqda / Просрочили 2 из 3 исполнителей");
  });

  it("title prefixes the registration number when present", () => {
    expect(taskNotificationTitle("2026/10/05-01", "Hisobot")).toBe("2026/10/05-01 Hisobot");
    expect(taskNotificationTitle(null, "Hisobot")).toBe("Hisobot");
  });

  it("kontragent links go to the contractor portal", () => {
    expect(taskLinkFor("kontragent", "abc")).toBe("/contractor/tasks/abc");
    expect(taskLinkFor("mutaxassis", "abc")).toBe("/tasks/abc");
    expect(taskLinkFor(null, "abc")).toBe("/tasks/abc");
  });

  it("parses lookback env with a safe fallback", () => {
    expect(parseLookbackDays(undefined)).toBe(14);
    expect(parseLookbackDays("")).toBe(14);
    expect(parseLookbackDays("7")).toBe(7);
    expect(parseLookbackDays("abc")).toBe(14);
    expect(parseLookbackDays("-3")).toBe(14);
    expect(parseLookbackDays("0")).toBe(0);
  });
});

describe("taskNotificationTitle bound", () => {
  it("never exceeds notifications.title varchar(255)", () => {
    const t = taskNotificationTitle("2026/10/05-01", "x".repeat(500));
    expect(Array.from(t).length).toBeLessThanOrEqual(255);
    expect(t.endsWith("…")).toBe(true);
  });
});
