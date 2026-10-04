import { describe, it, expect } from "vitest";
import {
  addDays,
  computeScale,
  countActiveOverlaps,
  deriveStageBars,
  diffDays,
  offsetPx,
  parseGroup,
  parseZoom,
  shortDate,
  tashkentToday,
  timelineExtent,
  widthPx,
  willMissContract,
  type Bar,
  type TLProject,
  type TLStage,
} from "./timeline";

const TODAY = "2026-10-05";

function stage(over: Partial<TLStage> & { orderIndex: number }): TLStage {
  return {
    id: `s${over.orderIndex}`,
    name: `Stage ${over.orderIndex}`,
    status: "locked",
    reviewStatus: "in_progress",
    plannedStart: null,
    plannedDeadline: null,
    startedAt: null,
    completedAt: null,
    responsibleName: null,
    ...over,
  };
}

function project(over: Partial<TLProject> = {}): TLProject {
  return {
    id: "p1",
    name: "Film",
    posterUrl: null,
    startDate: null,
    deadline: null,
    progress: 0,
    studioId: null,
    studioName: null,
    typeId: null,
    typeName: null,
    curators: [],
    stages: [],
    ...over,
  };
}

function bar(over: Partial<Bar>): Bar {
  return {
    stageId: "x",
    name: "x",
    start: "2026-10-01",
    end: "2026-10-10",
    status: "active",
    late: false,
    bkrmTurn: false,
    actualStart: null,
    actualEnd: null,
    responsibleName: null,
    legacy: false,
    estimated: false,
    ...over,
  };
}

describe("date helpers", () => {
  it("adds and diffs days across month/year boundaries", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDays("2026-10-01", "2026-10-15")).toBe(14);
    expect(diffDays("2026-10-15", "2026-10-01")).toBe(-14);
  });

  it("tashkentToday shifts UTC by +05:00", () => {
    expect(tashkentToday(new Date("2026-10-04T18:59:00Z"))).toBe("2026-10-04");
    expect(tashkentToday(new Date("2026-10-04T19:00:00Z"))).toBe("2026-10-05");
  });

  it("shortDate omits the current year", () => {
    expect(shortDate("2026-03-07", TODAY)).toBe("07.03");
    expect(shortDate("2027-01-15", TODAY)).toBe("15.01.2027");
  });
});

describe("deriveStageBars — start fallback chain", () => {
  it("uses planned_start when present and planned_deadline as end", () => {
    const [b] = deriveStageBars(
      project({ stages: [stage({ orderIndex: 0, plannedStart: "2026-09-01", plannedDeadline: "2026-09-20" })] }),
      TODAY,
    );
    expect(b.start).toBe("2026-09-01");
    expect(b.end).toBe("2026-09-20");
    expect(b.estimated).toBe(false);
    expect(b.legacy).toBe(false);
  });

  it("first stage without a start uses projects.start_date", () => {
    const [b] = deriveStageBars(
      project({ startDate: "2026-08-10", stages: [stage({ orderIndex: 0, plannedDeadline: "2026-09-01" })] }),
      TODAY,
    );
    expect(b.start).toBe("2026-08-10");
    expect(b.end).toBe("2026-09-01");
  });

  it("a stage without planned_start starts at the previous stage's planned_deadline", () => {
    const bars = deriveStageBars(
      project({
        startDate: "2026-01-01",
        stages: [
          stage({ orderIndex: 1, plannedDeadline: "2026-10-30" }),
          stage({ orderIndex: 0, plannedStart: "2026-09-01", plannedDeadline: "2026-09-20" }),
        ],
      }),
      TODAY,
    );
    // orderIndex boʻyicha tartiblanadi
    expect(bars.map((b) => b.stageId)).toEqual(["s0", "s1"]);
    expect(bars[1].start).toBe("2026-09-20");
    expect(bars[1].end).toBe("2026-10-30");
  });

  it("falls back to started_at, then to end − 14 days", () => {
    const [a] = deriveStageBars(
      project({ stages: [stage({ orderIndex: 0, startedAt: "2026-09-03", plannedDeadline: "2026-09-30" })] }),
      TODAY,
    );
    expect(a.start).toBe("2026-09-03");
    const [b] = deriveStageBars(project({ stages: [stage({ orderIndex: 0, plannedDeadline: "2026-09-30" })] }), TODAY);
    expect(b.start).toBe("2026-09-16");
  });

  it("stage without planned_deadline gets start + 14 days and is estimated (never late)", () => {
    const bars = deriveStageBars(
      project({
        stages: [
          stage({ orderIndex: 0, plannedStart: "2026-08-01", status: "active" }),
          stage({ orderIndex: 1 }),
        ],
      }),
      TODAY,
    );
    expect(bars[0].end).toBe("2026-08-15");
    expect(bars[0].estimated).toBe(true);
    expect(bars[0].late).toBe(false);
    // keyingi bosqich taxminiy tugashdan davom etadi
    expect(bars[1].start).toBe("2026-08-15");
    expect(bars[1].end).toBe("2026-08-29");
  });

  it("clamps an inverted interval instead of drawing a negative bar", () => {
    const bars = deriveStageBars(
      project({
        stages: [
          stage({ orderIndex: 0, plannedStart: "2026-09-01", plannedDeadline: "2026-09-20" }),
          stage({ orderIndex: 1, plannedDeadline: "2026-09-10" }),
        ],
      }),
      TODAY,
    );
    expect(bars[1].start).toBe("2026-09-10");
    expect(bars[1].end).toBe("2026-09-10");
  });
});

describe("deriveStageBars — flags", () => {
  it("late only for active stages whose deadline is before today", () => {
    const bars = deriveStageBars(
      project({
        stages: [
          stage({ orderIndex: 0, status: "completed", plannedDeadline: "2026-09-01", completedAt: "2026-09-02" }),
          stage({ orderIndex: 1, status: "active", plannedDeadline: "2026-10-04", startedAt: "2026-09-02" }),
          stage({ orderIndex: 2, status: "locked", plannedDeadline: "2026-10-01" }),
        ],
      }),
      TODAY,
    );
    expect(bars.map((b) => b.late)).toEqual([false, true, false]);
  });

  it("deadline today is not late", () => {
    const [b] = deriveStageBars(
      project({ stages: [stage({ orderIndex: 0, status: "active", plannedDeadline: TODAY })] }),
      TODAY,
    );
    expect(b.late).toBe(false);
  });

  it("bkrmTurn when active and submitted", () => {
    const bars = deriveStageBars(
      project({
        stages: [
          stage({ orderIndex: 0, status: "active", reviewStatus: "submitted", plannedDeadline: "2026-11-01" }),
          stage({ orderIndex: 1, status: "locked", reviewStatus: "submitted", plannedDeadline: "2026-12-01" }),
        ],
      }),
      TODAY,
    );
    expect(bars[0].bkrmTurn).toBe(true);
    expect(bars[1].bkrmTurn).toBe(false);
  });

  it("actual interval: completedAt, or today while active, else null", () => {
    const bars = deriveStageBars(
      project({
        stages: [
          stage({ orderIndex: 0, status: "completed", startedAt: "2026-08-01", completedAt: "2026-08-20", plannedDeadline: "2026-08-15" }),
          stage({ orderIndex: 1, status: "active", startedAt: "2026-08-20", plannedDeadline: "2026-11-01" }),
          stage({ orderIndex: 2, status: "locked", plannedDeadline: "2026-12-01" }),
        ],
      }),
      TODAY,
    );
    expect([bars[0].actualStart, bars[0].actualEnd]).toEqual(["2026-08-01", "2026-08-20"]);
    expect([bars[1].actualStart, bars[1].actualEnd]).toEqual(["2026-08-20", TODAY]);
    expect([bars[2].actualStart, bars[2].actualEnd]).toEqual([null, null]);
  });
});

describe("deriveStageBars — legacy projects", () => {
  it("one bar from start_date to deadline", () => {
    const bars = deriveStageBars(project({ startDate: "2026-01-01", deadline: "2026-12-31", progress: 40 }), TODAY);
    expect(bars).toHaveLength(1);
    expect(bars[0]).toMatchObject({ stageId: null, legacy: true, start: "2026-01-01", end: "2026-12-31", status: "active", late: false });
  });

  it("none when both dates are null", () => {
    expect(deriveStageBars(project(), TODAY)).toEqual([]);
  });

  it("completed by progress, late when past deadline", () => {
    expect(deriveStageBars(project({ startDate: "2026-01-01", deadline: "2026-02-01", progress: 100 }), TODAY)[0].status).toBe("completed");
    const [late] = deriveStageBars(project({ startDate: "2026-01-01", deadline: "2026-02-01", progress: 50 }), TODAY);
    expect(late.late).toBe(true);
  });

  it("fills a missing side with 14 days", () => {
    const [onlyStart] = deriveStageBars(project({ startDate: "2026-11-01" }), TODAY);
    expect(onlyStart).toMatchObject({ start: "2026-11-01", end: "2026-11-15", estimated: true, status: "locked" });
    const [onlyEnd] = deriveStageBars(project({ deadline: "2026-11-15", progress: 10 }), TODAY);
    expect(onlyEnd).toMatchObject({ start: "2026-11-01", end: "2026-11-15", estimated: false });
  });
});

describe("willMissContract", () => {
  const stages = [
    stage({ orderIndex: 0, status: "active", plannedStart: "2026-10-01", plannedDeadline: "2026-11-01" }),
    stage({ orderIndex: 1, status: "locked", plannedDeadline: "2026-12-20" }),
  ];

  it("true when the last bar ends after the contract deadline", () => {
    const p = project({ deadline: "2026-12-15", stages });
    expect(willMissContract(p, deriveStageBars(p, TODAY))).toBe(true);
  });

  it("false when the plan fits, or no deadline, or no bars", () => {
    const p = project({ deadline: "2026-12-31", stages });
    expect(willMissContract(p, deriveStageBars(p, TODAY))).toBe(false);
    expect(willMissContract({ deadline: null }, deriveStageBars(p, TODAY))).toBe(false);
    expect(willMissContract({ deadline: "2026-12-31" }, [])).toBe(false);
  });

  it("an active late stage pushes the forecast by its lateness", () => {
    const late = [
      stage({ orderIndex: 0, status: "active", plannedStart: "2026-09-01", plannedDeadline: "2026-09-20" }),
      stage({ orderIndex: 1, status: "locked", plannedDeadline: "2026-12-20" }),
    ];
    // 15 kun kechikish: 2026-12-20 + 15 = 2027-01-04
    const tight = project({ deadline: "2026-12-31", stages: late });
    expect(willMissContract(tight, deriveStageBars(tight, TODAY))).toBe(true);
    const loose = project({ deadline: "2027-01-10", stages: late });
    expect(willMissContract(loose, deriveStageBars(loose, TODAY))).toBe(false);
  });

  it("false when every stage is completed", () => {
    const done = project({
      deadline: "2026-01-01",
      stages: [stage({ orderIndex: 0, status: "completed", plannedDeadline: "2026-03-01" })],
    });
    expect(willMissContract(done, deriveStageBars(done, TODAY))).toBe(false);
  });
});

describe("computeScale", () => {
  it("month zoom pads to month boundaries, 6px/day, monthly ticks", () => {
    const s = computeScale("2026-09-14", "2026-11-03", "month");
    expect(s.start).toBe("2026-09-01");
    expect(s.end).toBe("2026-12-01");
    expect(s.dayPx).toBe(6);
    expect(s.ticks.map((t) => t.iso)).toEqual(["2026-09-01", "2026-10-01", "2026-11-01"]);
    expect(s.ticks.every((t) => t.major)).toBe(true);
    expect(s.totalDays).toBe(91);
    expect(s.widthPx).toBe(546);
  });

  it("quarter zoom pads to quarter boundaries, 2.5px/day, quarter starts are major", () => {
    const s = computeScale("2026-08-20", "2026-10-05", "quarter", ["Y", "F", "M", "A", "M", "I", "I", "A", "S", "O", "N", "D"]);
    expect(s.start).toBe("2026-07-01");
    expect(s.end).toBe("2027-01-01");
    expect(s.dayPx).toBe(2.5);
    expect(s.ticks).toHaveLength(6);
    expect(s.ticks.filter((t) => t.major).map((t) => t.iso)).toEqual(["2026-07-01", "2026-10-01"]);
    expect(s.ticks[0].label).toBe("I 2026");
    expect(s.ticks[1].label).toBe("A");
  });

  it("year zoom pads to year boundaries, 0.9px/day, quarterly ticks", () => {
    const s = computeScale("2026-12-31", "2026-02-01", "year"); // teskari tartib ham qabul qilinadi
    expect(s.start).toBe("2026-01-01");
    expect(s.end).toBe("2027-01-01");
    expect(s.dayPx).toBe(0.9);
    expect(s.ticks.map((t) => t.iso)).toEqual(["2026-01-01", "2026-04-01", "2026-07-01", "2026-10-01"]);
    expect(s.ticks.map((t) => t.major)).toEqual([true, false, false, false]);
  });

  it("spans multiple years", () => {
    const s = computeScale("2025-11-10", "2027-02-01", "year");
    expect(s.start).toBe("2025-01-01");
    expect(s.end).toBe("2028-01-01");
    expect(s.ticks).toHaveLength(12);
  });
});

describe("offsetPx / widthPx", () => {
  it("positions today and deadlines consistently at every zoom", () => {
    for (const zoom of ["month", "quarter", "year"] as const) {
      const s = computeScale("2026-09-14", "2026-12-20", zoom);
      const today = offsetPx(TODAY, s);
      expect(today).toBeCloseTo(diffDays(s.start, TODAY) * s.dayPx);
      expect(offsetPx(s.start, s)).toBe(0);
      const tail = s.widthPx - offsetPx(s.end, s);
      expect(tail).toBeGreaterThanOrEqual(0);
      expect(tail).toBeLessThan(1);
      // muddat (kun oxiri) bugundan keyin
      expect(offsetPx("2026-12-20", s) + s.dayPx).toBeGreaterThan(today);
    }
  });

  it("width includes both end days", () => {
    const s = computeScale("2026-10-01", "2026-10-31", "month");
    expect(widthPx("2026-10-01", "2026-10-01", s)).toBe(6);
    expect(widthPx("2026-10-01", "2026-10-10", s)).toBe(60);
    expect(widthPx("2026-10-10", "2026-10-01", s)).toBe(0);
  });
});

describe("countActiveOverlaps", () => {
  it("returns 0 with no active bars", () => {
    expect(countActiveOverlaps([])).toBe(0);
    expect(countActiveOverlaps([[bar({ status: "completed" })], [bar({ status: "locked" })]])).toBe(0);
  });

  it("counts the maximum number of simultaneously active bars", () => {
    const lane = [
      [bar({ start: "2026-10-01", end: "2026-10-20" })],
      [bar({ start: "2026-10-10", end: "2026-10-30" })],
      [bar({ start: "2026-10-15", end: "2026-11-05" }), bar({ status: "locked", start: "2026-10-01", end: "2026-12-01" })],
      [bar({ start: "2026-11-01", end: "2026-11-10" })],
    ];
    expect(countActiveOverlaps(lane)).toBe(3);
  });

  it("touching intervals overlap on the shared day; adjacent ones do not", () => {
    expect(countActiveOverlaps([[bar({ start: "2026-10-01", end: "2026-10-10" })], [bar({ start: "2026-10-10", end: "2026-10-20" })]])).toBe(2);
    expect(countActiveOverlaps([[bar({ start: "2026-10-01", end: "2026-10-09" })], [bar({ start: "2026-10-10", end: "2026-10-20" })]])).toBe(1);
  });

  it("a late active bar still runs until today (actualEnd)", () => {
    const lane = [
      [bar({ start: "2026-09-01", end: "2026-09-10", late: true, actualEnd: TODAY })],
      [bar({ start: "2026-10-01", end: "2026-10-20", actualEnd: TODAY })],
    ];
    expect(countActiveOverlaps(lane)).toBe(2);
  });
});

describe("timelineExtent", () => {
  it("covers bars, actual intervals, deadlines and today", () => {
    const e = timelineExtent(
      [
        { bars: [bar({ start: "2026-09-01", end: "2026-09-10", actualStart: "2026-08-25" })], deadline: "2027-02-01" },
        { bars: [], deadline: null },
      ],
      TODAY,
    );
    expect(e).toEqual({ min: "2026-08-25", max: "2027-02-01" });
    expect(timelineExtent([], TODAY)).toEqual({ min: TODAY, max: TODAY });
  });
});

describe("parseZoom / parseGroup", () => {
  it("accepts known values and falls back to defaults", () => {
    expect(parseZoom("month")).toBe("month");
    expect(parseZoom("year")).toBe("year");
    expect(parseZoom(undefined)).toBe("quarter");
    expect(parseZoom("week")).toBe("quarter");
    expect(parseGroup("studio")).toBe("studio");
    expect(parseGroup("curator")).toBe("curator");
    expect(parseGroup(null)).toBe("none");
    expect(parseGroup("x")).toBe("none");
  });
});
