import { describe, expect, it } from "vitest";
import {
  addDays,
  addWeeks,
  canEditWeeklySummary,
  canViewWeeklyBrief,
  compactAmount,
  EMPTY_METRICS,
  formatInt,
  isEstimatedMetrics,
  isIsoDay,
  isoWeekLabel,
  KPI_TILES,
  lastCompletedWeekStart,
  metricDelta,
  normalizeMetrics,
  numericDay,
  parseWeekParam,
  recentWeekStarts,
  shortDay,
  sparklinePath,
  tashkentDayOf,
  tashkentIsoWeekday,
  tashkentToday,
  weekOptionLabel,
  weekRangeLabel,
  weekStartOf,
  weekWindow,
} from "./weekly-brief-core";

// 2026-10-05 is a Monday.
const MON_0800 = new Date("2026-10-05T08:00:00+05:00");

describe("Tashkent calendar helpers", () => {
  it("uses the Tashkent date, not UTC", () => {
    // 2026-10-04 20:30 UTC = 2026-10-05 01:30 in Tashkent (Monday)
    const lateSundayUtc = new Date("2026-10-04T20:30:00Z");
    expect(tashkentToday(lateSundayUtc)).toBe("2026-10-05");
    expect(tashkentIsoWeekday(lateSundayUtc)).toBe(1);
    // 2026-10-04 18:59 UTC = 23:59 Sunday in Tashkent
    expect(tashkentIsoWeekday(new Date("2026-10-04T18:59:00Z"))).toBe(7);
  });

  it("validates real calendar days", () => {
    expect(isIsoDay("2026-10-05")).toBe(true);
    expect(isIsoDay("2026-02-30")).toBe(false);
    expect(isIsoDay("2026-10-5")).toBe(false);
    expect(isIsoDay(undefined)).toBe(false);
    expect(isIsoDay(20261005)).toBe(false);
  });

  it("adds days and weeks across month/year boundaries", () => {
    expect(addDays("2026-09-28", 7)).toBe("2026-10-05");
    expect(addWeeks("2026-01-05", -1)).toBe("2025-12-29");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("snaps any day to its Monday", () => {
    expect(weekStartOf("2026-10-05")).toBe("2026-10-05"); // Monday
    expect(weekStartOf("2026-10-11")).toBe("2026-10-05"); // Sunday
    expect(weekStartOf("2026-10-08")).toBe("2026-10-05"); // Thursday
    expect(weekStartOf("2026-01-01")).toBe("2025-12-29");
  });

  it("returns the previous full week", () => {
    expect(lastCompletedWeekStart(MON_0800)).toBe("2026-09-28");
    expect(lastCompletedWeekStart(new Date("2026-10-11T23:00:00+05:00"))).toBe("2026-09-28");
    expect(lastCompletedWeekStart(new Date("2026-10-12T00:10:00+05:00"))).toBe("2026-10-05");
  });

  it("parses the ?week= param, snapping and clamping", () => {
    expect(parseWeekParam(undefined, MON_0800)).toBe("2026-09-28");
    expect(parseWeekParam("garbage", MON_0800)).toBe("2026-09-28");
    expect(parseWeekParam("2026-09-17", MON_0800)).toBe("2026-09-14");
    expect(parseWeekParam(["2026-09-07", "x"], MON_0800)).toBe("2026-09-07");
    // the running week and the future are not allowed
    expect(parseWeekParam("2026-10-05", MON_0800)).toBe("2026-09-28");
    expect(parseWeekParam("2027-01-04", MON_0800)).toBe("2026-09-28");
    expect(parseWeekParam("1999-01-04", MON_0800)).toBe("2026-09-28");
  });

  it("lists recent Mondays newest first", () => {
    const w = recentWeekStarts("2026-09-28", 12);
    expect(w).toHaveLength(12);
    expect(w[0]).toBe("2026-09-28");
    expect(w[1]).toBe("2026-09-21");
    expect(w[11]).toBe("2026-07-13");
  });

  it("labels ISO weeks", () => {
    expect(isoWeekLabel("2026-09-28")).toBe("2026-W40");
    expect(isoWeekLabel("2025-12-29")).toBe("2026-W01");
    expect(isoWeekLabel("2020-12-28")).toBe("2020-W53");
    expect(weekRangeLabel("2026-09-28")).toBe("28.09–04.10");
    expect(weekOptionLabel("2025-09-29")).toBe("2025-W40 (29.09–05.10)");
  });

  it("builds the Tashkent window as UTC instants", () => {
    expect(weekWindow("2026-09-28")).toEqual({
      startIso: "2026-09-27T19:00:00.000Z",
      endIso: "2026-10-04T19:00:00.000Z",
      endDay: "2026-10-05",
    });
  });

  it("formats days in Tashkent", () => {
    expect(tashkentDayOf("2026-10-05")).toBe("2026-10-05");
    expect(tashkentDayOf(new Date("2026-10-04T20:00:00Z"))).toBe("2026-10-05");
    expect(tashkentDayOf("not a date")).toBeNull();
    expect(shortDay("2026-10-05")).toBe("05.10");
    expect(numericDay(new Date("2026-10-04T20:00:00Z"))).toBe("05.10.2026");
    expect(shortDay(null)).toBe("—");
  });
});

describe("metrics", () => {
  it("normalizes jsonb metrics defensively", () => {
    expect(normalizeMetrics(null)).toEqual(EMPTY_METRICS);
    const m = normalizeMetrics({ activeProjects: "12", paidUzs: 1500000.5, overdueTasks: "x", extra: 1 });
    expect(m.activeProjects).toBe(12);
    expect(m.paidUzs).toBe(1500000.5);
    expect(m.overdueTasks).toBe(0);
    expect(m).not.toHaveProperty("extra");
    expect(normalizeMetrics('{"reviewQueue":4}').reviewQueue).toBe(4);
    expect(normalizeMetrics("not json")).toEqual(EMPTY_METRICS);
  });

  it("detects estimated snapshots and strips the flag from metrics", () => {
    expect(isEstimatedMetrics({ ...EMPTY_METRICS, estimated: true })).toBe(true);
    expect(isEstimatedMetrics('{"activeProjects":3,"estimated":true}')).toBe(true);
    expect(isEstimatedMetrics(EMPTY_METRICS)).toBe(false);
    expect(isEstimatedMetrics({ estimated: "true" })).toBe(false);
    expect(isEstimatedMetrics(null)).toBe(false);
    expect(isEstimatedMetrics("not json")).toBe(false);
    expect(normalizeMetrics({ activeProjects: 2, estimated: true })).not.toHaveProperty("estimated");
  });

  it("colours deltas by good direction", () => {
    expect(metricDelta(5, null, "down")).toBeNull();
    expect(metricDelta(5, 3, "down")).toEqual({ diff: 2, direction: "up", tone: "bad" });
    expect(metricDelta(1, 3, "down")).toEqual({ diff: -2, direction: "down", tone: "good" });
    expect(metricDelta(9, 3, "up")).toEqual({ diff: 6, direction: "up", tone: "good" });
    expect(metricDelta(3, 3, "up")).toEqual({ diff: 0, direction: "flat", tone: "neutral" });
    expect(metricDelta(4, 3, "neutral")?.tone).toBe("neutral");
  });

  it("defines the 7 KPI tiles with only paidUzs as money", () => {
    expect(KPI_TILES).toHaveLength(7);
    expect(KPI_TILES.filter((k) => k.money).map((k) => k.key)).toEqual(["paidUzs"]);
    expect(KPI_TILES.filter((k) => !k.pointInTime).map((k) => k.key)).toEqual(["paidUzs"]);
  });

  it("builds sparkline paths only with 2+ points", () => {
    expect(sparklinePath([], 100, 28)).toBeNull();
    expect(sparklinePath([4], 100, 28)).toBeNull();
    const p = sparklinePath([0, 10], 100, 20, 0)!;
    expect(p.line).toBe("M0 20 L100 0");
    expect(p.area).toBe("M0 20 L100 0 L100 20 L0 20 Z");
    // flat series sits in the middle
    expect(sparklinePath([3, 3, 3], 100, 20, 0)!.line).toBe("M0 10 L50 10 L100 10");
  });

  it("formats numbers locale-independently", () => {
    expect(formatInt(12500000)).toBe("12 500 000");
    expect(formatInt(-1234)).toBe("-1 234");
    expect(compactAmount(1_250_000_000)).toEqual({ n: "1,3", unit: "billion" });
    expect(compactAmount(48_000_000)).toEqual({ n: "48", unit: "million" });
    expect(compactAmount(950_000)).toEqual({ n: "950 000", unit: null });
  });
});

describe("permissions", () => {
  it("lets the 4 manager roles and the owner view", () => {
    for (const p of ["direktor", "orinbosar", "koordinator", "bolim_boshligi"]) expect(canViewWeeklyBrief(p, false)).toBe(true);
    for (const p of ["mutaxassis", "bosh_mutaxassis", "hr", "kontragent", null]) expect(canViewWeeklyBrief(p, false)).toBe(false);
    expect(canViewWeeklyBrief("mutaxassis", true)).toBe(true);
  });

  it("lets only direktor, orinbosar and the owner write the summary", () => {
    expect(canEditWeeklySummary("direktor", false)).toBe(true);
    expect(canEditWeeklySummary("orinbosar", false)).toBe(true);
    expect(canEditWeeklySummary("koordinator", false)).toBe(false);
    expect(canEditWeeklySummary("bolim_boshligi", false)).toBe(false);
    expect(canEditWeeklySummary("mutaxassis", true)).toBe(true);
  });
});
