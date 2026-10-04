import { describe, it, expect } from "vitest";
import {
  avgSlipPerStage,
  baselineEnd,
  buildBenchmarks,
  daysBetween,
  deltaDays,
  durationDays,
  fmtDmy,
  isReschedule,
  isUnrealisticNorm,
  median,
  normalizeIsoDay,
  percentile,
  projectSlip,
  slipTone,
  tashkentDay,
  type BenchmarkSample,
  type DeadlineChangeLite,
} from "./slippage";

describe("daysBetween / deltaDays", () => {
  it("counts calendar days, positive when b is later", () => {
    expect(daysBetween("2026-10-01", "2026-10-05")).toBe(4);
    expect(daysBetween("2026-10-05", "2026-10-01")).toBe(-4);
    expect(daysBetween("2026-10-05", "2026-10-05")).toBe(0);
  });

  it("crosses month and leap-year boundaries", () => {
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });

  it("deltaDays is new − old and null when either side is missing", () => {
    expect(deltaDays("2026-10-01", "2026-10-11")).toBe(10);
    expect(deltaDays("2026-10-11", "2026-10-01")).toBe(-10);
    expect(deltaDays(null, "2026-10-01")).toBeNull();
    expect(deltaDays("2026-10-01", null)).toBeNull();
    expect(deltaDays("", "2026-10-01")).toBeNull();
  });

  it("normalizes ISO-ish values and rejects garbage", () => {
    expect(normalizeIsoDay("2026-10-05T12:00:00Z")).toBe("2026-10-05");
    expect(normalizeIsoDay("05.10.2026")).toBeNull();
    expect(normalizeIsoDay(undefined)).toBeNull();
  });
});

describe("median / percentile", () => {
  it("returns null for an empty list", () => {
    expect(median([])).toBeNull();
    expect(percentile([], 80)).toBeNull();
  });

  it("median of odd and even lists", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([7])).toBe(7);
  });

  it("P80 uses linear interpolation (PERCENTILE.INC)", () => {
    // rank = 0.8 × 4 = 3.2 → 40 + 0.2 × (50 − 40) = 42
    expect(percentile([10, 20, 30, 40, 50], 80)).toBeCloseTo(42);
    // rank = 0.8 × 2 = 1.6 → 20 + 0.6 × 10 = 26
    expect(percentile([30, 10, 20], 80)).toBeCloseTo(26);
    expect(percentile([1, 2, 3, 4], 0)).toBe(1);
    expect(percentile([1, 2, 3, 4], 100)).toBe(4);
  });

  it("clamps p and ignores non-finite values", () => {
    expect(percentile([1, 2, 3], 150)).toBe(3);
    expect(percentile([1, 2, 3], -5)).toBe(1);
    expect(percentile([1, Number.NaN, 3], 50)).toBe(2);
  });
});

describe("baselineEnd", () => {
  it("prefers the chronologically first non-null old deadline", () => {
    const changes = [
      { oldDeadline: "2026-11-10", newDeadline: "2026-12-01", createdAt: "2026-10-03T10:00:00Z" },
      { oldDeadline: "2026-11-01", newDeadline: "2026-11-10", createdAt: "2026-10-01T10:00:00Z" },
    ];
    expect(baselineEnd(changes, "2026-12-01")).toBe("2026-11-01");
  });

  it("skips null old deadlines (e.g. backfill rows) when looking for the baseline", () => {
    const changes = [
      { oldDeadline: null, newDeadline: "2026-11-01", createdAt: "2026-09-01T00:00:00Z" },
      { oldDeadline: "2026-11-05", newDeadline: "2026-11-20", createdAt: "2026-10-01T00:00:00Z" },
    ];
    expect(baselineEnd(changes, "2026-11-20")).toBe("2026-11-05");
  });

  it("falls back to the first new deadline, then to currentEnd", () => {
    const onlyNew = [
      { oldDeadline: null, newDeadline: "2026-12-15", createdAt: new Date("2026-10-02T00:00:00Z") },
      { oldDeadline: null, newDeadline: "2026-12-01", createdAt: new Date("2026-10-01T00:00:00Z") },
    ];
    expect(baselineEnd(onlyNew, "2026-12-31")).toBe("2026-12-01");
    expect(baselineEnd([], "2026-12-31")).toBe("2026-12-31");
    expect(baselineEnd([], null)).toBeNull();
  });
});

describe("projectSlip", () => {
  const stages = [
    { id: "s1", orderIndex: 0, plannedDeadline: "2026-10-01" },
    { id: "s2", orderIndex: 1, plannedDeadline: "2026-11-01" },
    { id: "s3", orderIndex: 2, plannedDeadline: "2026-12-20" },
  ];

  it("computes slip from the last stage's baseline and counts reschedules", () => {
    const changes: DeadlineChangeLite[] = [
      { stageId: "s3", oldDeadline: "2026-12-01", newDeadline: "2026-12-10", deltaDays: 9, source: "edit", createdAt: "2026-10-01T00:00:00Z" },
      { stageId: "s3", oldDeadline: "2026-12-10", newDeadline: "2026-12-20", deltaDays: 10, source: "studio_request", createdAt: "2026-10-02T00:00:00Z" },
      { stageId: "s1", oldDeadline: "2026-09-20", newDeadline: "2026-10-01", deltaDays: 11, source: "manual", createdAt: "2026-09-15T00:00:00Z" },
      // not a reschedule: first deadline assignment and a historical row
      { stageId: "s2", oldDeadline: null, newDeadline: "2026-11-01", deltaDays: null, source: "edit", createdAt: "2026-09-01T00:00:00Z" },
      { stageId: "s2", oldDeadline: null, newDeadline: "2026-10-25", deltaDays: null, source: "backfill", createdAt: "2026-08-01T00:00:00Z" },
    ];
    const r = projectSlip(stages, changes);
    expect(r.currentEnd).toBe("2026-12-20");
    expect(r.baselineEnd).toBe("2026-12-01");
    expect(r.slipDays).toBe(19);
    expect(r.reschedules).toBe(3);
    expect(r.studioReschedules).toBe(1);
    expect(r.studioShare).toBeCloseTo(1 / 3);
    expect(r.rescheduleDelta).toBe(30);
  });

  it("without changes on the last stage, a middle stage overrunning it still counts as slip", () => {
    const st = [
      { id: "a", orderIndex: 0, plannedDeadline: "2027-01-10" },
      { id: "b", orderIndex: 1, plannedDeadline: "2026-12-31" },
    ];
    const r = projectSlip(st, []);
    expect(r.baselineEnd).toBe("2026-12-31");
    expect(r.currentEnd).toBe("2027-01-10");
    expect(r.slipDays).toBe(10);
    expect(r.reschedules).toBe(0);
    expect(r.studioShare).toBeNull();
  });

  it("returns null slip when no stage has a deadline", () => {
    const r = projectSlip([{ id: "x", orderIndex: 0, plannedDeadline: null }], []);
    expect(r.currentEnd).toBeNull();
    expect(r.slipDays).toBeNull();
  });

  it("derives a missing delta from the dates", () => {
    const r = projectSlip(stages, [
      { stageId: "s2", oldDeadline: "2026-10-20", newDeadline: "2026-11-01", deltaDays: null, source: "manual", createdAt: "2026-10-01T00:00:00Z" },
    ]);
    expect(r.rescheduleDelta).toBe(12);
  });
});

describe("helpers", () => {
  it("isReschedule excludes backfill rows and first assignments", () => {
    expect(isReschedule({ source: "edit", oldDeadline: "2026-10-01" })).toBe(true);
    expect(isReschedule({ source: "edit", oldDeadline: null })).toBe(false);
    expect(isReschedule({ source: "backfill", oldDeadline: "2026-10-01" })).toBe(false);
  });

  it("slipTone thresholds", () => {
    expect(slipTone(null)).toBe("muted");
    expect(slipTone(-3)).toBe("green");
    expect(slipTone(0)).toBe("green");
    expect(slipTone(1)).toBe("amber");
    expect(slipTone(14)).toBe("amber");
    expect(slipTone(15)).toBe("red");
  });

  it("isUnrealisticNorm when median exceeds norm by more than 25%", () => {
    expect(isUnrealisticNorm(13, 10)).toBe(true);
    expect(isUnrealisticNorm(12.5, 10)).toBe(false);
    expect(isUnrealisticNorm(20, null)).toBe(false);
    expect(isUnrealisticNorm(null, 10)).toBe(false);
    expect(isUnrealisticNorm(5, 0)).toBe(false);
  });

  it("avgSlipPerStage rounds to one decimal and guards zero stages", () => {
    expect(avgSlipPerStage(10, 3)).toBe(3.3);
    expect(avgSlipPerStage(5, 0)).toBeNull();
  });

  it("fmtDmy and Tashkent day/duration", () => {
    expect(fmtDmy("2026-10-05")).toBe("05.10.2026");
    expect(fmtDmy(null)).toBe("—");
    // 20:00 UTC on Oct 4 is already Oct 5 in Tashkent (+05:00)
    expect(tashkentDay("2026-10-04T20:00:00Z")).toBe("2026-10-05");
    expect(durationDays("2026-10-01T04:00:00Z", "2026-10-11T18:00:00Z")).toBe(10);
    expect(durationDays("2026-10-05T00:00:00Z", "2026-10-04T00:00:00Z")).toBe(0);
  });
});

describe("buildBenchmarks", () => {
  const s = (templateItemId: string, days: number, extra: Partial<BenchmarkSample> = {}): BenchmarkSample => ({
    templateItemId,
    stageName: `Stage ${templateItemId}`,
    typeName: "Film",
    defaultDays: 10,
    days,
    ...extra,
  });

  it("hides template stages with fewer than 3 samples", () => {
    const rows = buildBenchmarks([s("a", 5), s("a", 7), s("b", 1), s("b", 2), s("b", 3)]);
    expect(rows.map((r) => r.templateItemId)).toEqual(["b"]);
    expect(rows[0]).toMatchObject({ n: 3, median: 2, p80: 2.6, defaultDays: 10 });
  });

  it("merges type names and sorts by type then template order", () => {
    const rows = buildBenchmarks([
      s("late", 10, { itemOrder: 5, typeOrder: 0 }),
      s("late", 12, { itemOrder: 5, typeOrder: 0, typeName: "Serial" }),
      s("late", 14, { itemOrder: 5, typeOrder: 0 }),
      s("early", 3, { itemOrder: 1, typeOrder: 0 }),
      s("early", 4, { itemOrder: 1, typeOrder: 0 }),
      s("early", 5, { itemOrder: 1, typeOrder: 0 }),
    ]);
    expect(rows.map((r) => r.templateItemId)).toEqual(["early", "late"]);
    expect(rows[1].typeName).toBe("Film, Serial");
    expect(rows[1].median).toBe(12);
  });
});
