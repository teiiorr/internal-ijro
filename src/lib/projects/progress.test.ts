import { describe, it, expect } from "vitest";
import { overallProgress, derivedStatus, stageProgress } from "./progress";

describe("stageProgress", () => {
  it("returns 0 for empty list", () => {
    expect(stageProgress([])).toBe(0);
  });

  it("counts completed / total (unweighted)", () => {
    const s = (status: string) => ({ status });
    // 1 of 4 completed → 25%
    expect(stageProgress([s("completed"), s("active"), s("locked"), s("locked")])).toBe(25);
    // 1 of 6 completed → 17% (rounded)
    expect(stageProgress([s("completed"), s("active"), s("locked"), s("locked"), s("locked"), s("locked")])).toBe(17);
    // all completed → 100%
    expect(stageProgress([s("completed"), s("completed"), s("completed")])).toBe(100);
    // none completed → 0%
    expect(stageProgress([s("active"), s("locked")])).toBe(0);
  });
});

describe("overallProgress", () => {
  it("returns 0 for empty list", () => {
    expect(overallProgress([])).toBe(0);
  });

  it("returns the single stage progress as-is", () => {
    expect(overallProgress([{ progress: 47, weight: 1 }])).toBe(47);
    expect(overallProgress([{ progress: 100, weight: 5 }])).toBe(100);
  });

  it("simple average with equal weights", () => {
    // 25 + 75 → 50
    expect(overallProgress([{ progress: 25, weight: 1 }, { progress: 75, weight: 1 }])).toBe(50);
    // 0 + 50 + 100 → 50
    expect(
      overallProgress([
        { progress: 0, weight: 1 },
        { progress: 50, weight: 1 },
        { progress: 100, weight: 1 },
      ])
    ).toBe(50);
  });

  it("weighted average — heavier stages dominate", () => {
    // (100*3 + 0*1) / 4 = 75
    expect(overallProgress([{ progress: 100, weight: 3 }, { progress: 0, weight: 1 }])).toBe(75);
    // (50*2 + 100*1 + 0*1) / 4 = 50
    expect(
      overallProgress([
        { progress: 50, weight: 2 },
        { progress: 100, weight: 1 },
        { progress: 0, weight: 1 },
      ])
    ).toBe(50);
  });

  it("always rounds to an integer in [0, 100]", () => {
    // (33 + 34) / 2 = 33.5 → 34
    expect(overallProgress([{ progress: 33, weight: 1 }, { progress: 34, weight: 1 }])).toBe(34);
    const r = overallProgress([{ progress: 99, weight: 1 }, { progress: 100, weight: 2 }]);
    expect(Number.isInteger(r)).toBe(true);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(100);
  });

  it("clamps out-of-range progress values", () => {
    expect(overallProgress([{ progress: 200 as number, weight: 1 }])).toBe(100);
    expect(overallProgress([{ progress: -50 as number, weight: 1 }])).toBe(0);
  });

  it("treats non-positive weights as 1 (defensive)", () => {
    // weight 0 → 1; (50*1 + 100*1) / 2 = 75
    expect(overallProgress([{ progress: 50, weight: 0 as number }, { progress: 100, weight: 1 }])).toBe(75);
  });

  it("handles null/undefined fields gracefully", () => {
    // null progress → 0
    expect(overallProgress([{ progress: null, weight: 1 }])).toBe(0);
    // null weight → 1
    expect(overallProgress([{ progress: 80, weight: null }])).toBe(80);
  });

  it("100% only when every stage is 100% (under equal weights)", () => {
    expect(
      overallProgress([
        { progress: 100, weight: 1 },
        { progress: 100, weight: 1 },
        { progress: 100, weight: 1 },
      ])
    ).toBe(100);
    expect(
      overallProgress([
        { progress: 100, weight: 1 },
        { progress: 99, weight: 1 },
      ])
    ).toBe(100); // round(199/2)=100, edge case worth documenting
  });
});

describe("derivedStatus", () => {
  it("on_hold override beats everything", () => {
    expect(derivedStatus(0, "on_hold")).toBe("on_hold");
    expect(derivedStatus(50, "on_hold")).toBe("on_hold");
    expect(derivedStatus(100, "on_hold")).toBe("on_hold");
  });

  it("0% → not_started", () => {
    expect(derivedStatus(0)).toBe("not_started");
    expect(derivedStatus(0, null)).toBe("not_started");
  });

  it("100% → completed", () => {
    expect(derivedStatus(100)).toBe("completed");
  });

  it("in between → in_progress", () => {
    expect(derivedStatus(1)).toBe("in_progress");
    expect(derivedStatus(50)).toBe("in_progress");
    expect(derivedStatus(99)).toBe("in_progress");
  });
});
