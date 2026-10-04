import { describe, expect, it } from "vitest";
import { bucketForecast, mergeActualAndForecast, monthKey, nextMonths, orderCurrencies, shiftMonth } from "./forecast";

describe("monthKey", () => {
  it("keeps the calendar month of a plain date", () => {
    expect(monthKey("2026-10-05")).toBe("2026-10");
    expect(monthKey("2026-01-31")).toBe("2026-01");
  });

  it("accepts a month key as is", () => {
    expect(monthKey("2026-12")).toBe("2026-12");
  });

  it("shifts timestamps to Tashkent (+05:00) before taking the month", () => {
    // 30-sentabr 20:00 UTC = 1-oktabr 01:00 Toshkent
    expect(monthKey("2026-09-30T20:00:00Z")).toBe("2026-10");
    expect(monthKey("2026-09-30T18:59:59Z")).toBe("2026-09");
    expect(monthKey("2026-12-31T19:30:00.000Z")).toBe("2027-01");
  });

  it("throws on garbage", () => {
    expect(() => monthKey("not a date")).toThrow(RangeError);
  });
});

describe("shiftMonth / nextMonths", () => {
  it("crosses year boundaries in both directions", () => {
    expect(shiftMonth("2026-11", 3)).toBe("2027-02");
    expect(shiftMonth("2026-03", -6)).toBe("2025-09");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-05", 0)).toBe("2026-05");
  });

  it("returns n consecutive months starting with the month itself", () => {
    expect(nextMonths("2026-11-15", 4)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(nextMonths("2026-11-15", 0)).toEqual([]);
  });

  it("builds the 12-month window (last 6 + next 6)", () => {
    const months = nextMonths(shiftMonth("2026-10", -6), 12);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-04");
    expect(months[6]).toBe("2026-10");
    expect(months[11]).toBe("2027-03");
  });
});

describe("bucketForecast", () => {
  const months = ["2026-10", "2026-11", "2026-12"];

  it("puts deadlines inside the window into their month", () => {
    const b = bucketForecast(
      [
        { remaining: 100, currency: "UZS", plannedDeadline: "2026-10-31" },
        { remaining: 50, currency: "UZS", plannedDeadline: "2026-10-01" },
        { remaining: 70, currency: "UZS", plannedDeadline: "2026-12-15" },
      ],
      months,
    );
    expect(b.UZS["2026-10"]).toBe(150);
    expect(b.UZS["2026-11"]).toBe(0);
    expect(b.UZS["2026-12"]).toBe(70);
  });

  it("sends deadlines before the first month to 'overdue'", () => {
    const b = bucketForecast(
      [
        { remaining: 200, currency: "UZS", plannedDeadline: "2026-09-30" },
        { remaining: 10, currency: "UZS", plannedDeadline: "2025-01-01" },
      ],
      months,
    );
    expect(b.UZS.overdue).toBe(210);
    expect(b.UZS["2026-10"]).toBe(0);
  });

  it("sends missing or invalid deadlines to 'nodate'", () => {
    const b = bucketForecast(
      [
        { remaining: 5, currency: "UZS", plannedDeadline: null },
        { remaining: 7, currency: "UZS", plannedDeadline: "" },
        { remaining: 9, currency: "UZS", plannedDeadline: "garbage" },
      ],
      months,
    );
    expect(b.UZS.nodate).toBe(21);
    expect(b.UZS.overdue).toBe(0);
  });

  it("keeps deadlines after the horizon in 'later' instead of dropping them", () => {
    const b = bucketForecast([{ remaining: 40, currency: "UZS", plannedDeadline: "2027-05-01" }], months);
    expect(b.UZS.later).toBe(40);
  });

  it("never mixes currencies and ignores non-positive remainders", () => {
    const b = bucketForecast(
      [
        { remaining: 1000, currency: "UZS", plannedDeadline: "2026-11-02" },
        { remaining: 30, currency: "USD", plannedDeadline: "2026-11-20" },
        { remaining: 0, currency: "UZS", plannedDeadline: "2026-11-20" },
        { remaining: -15, currency: "USD", plannedDeadline: "2026-11-20" },
      ],
      months,
    );
    expect(b.UZS["2026-11"]).toBe(1000);
    expect(b.USD["2026-11"]).toBe(30);
    expect(Object.keys(b).sort()).toEqual(["USD", "UZS"]);
  });

  it("initialises every month and special bucket with zero", () => {
    const b = bucketForecast([{ remaining: 1, currency: "UZS", plannedDeadline: null }], months);
    expect(b.UZS).toEqual({ "2026-10": 0, "2026-11": 0, "2026-12": 0, overdue: 0, nodate: 1, later: 0 });
  });

  it("returns nothing for an empty input", () => {
    expect(bucketForecast([], months)).toEqual({});
  });
});

describe("mergeActualAndForecast", () => {
  it("builds one row per month for the chosen currency only", () => {
    const months = ["2026-09", "2026-10", "2026-11"];
    const forecast = bucketForecast(
      [
        { remaining: 300, currency: "UZS", plannedDeadline: "2026-11-10" },
        { remaining: 99, currency: "USD", plannedDeadline: "2026-11-10" },
      ],
      ["2026-10", "2026-11"],
    );
    const rows = mergeActualAndForecast(
      [
        { month: "2026-09", currency: "UZS", amount: 120 },
        { month: "2026-09", currency: "UZS", amount: 30 },
        { month: "2026-10", currency: "USD", amount: 500 },
      ],
      forecast,
      months,
      "UZS",
    );
    expect(rows).toEqual([
      { month: "2026-09", paid: 150, forecast: 0 },
      { month: "2026-10", paid: 0, forecast: 0 },
      { month: "2026-11", paid: 0, forecast: 300 },
    ]);
  });

  it("returns zero rows when a currency has no data", () => {
    expect(mergeActualAndForecast([], {}, ["2026-10"], "EUR")).toEqual([{ month: "2026-10", paid: 0, forecast: 0 }]);
  });
});

describe("orderCurrencies", () => {
  it("dedupes and puts UZS first", () => {
    expect(orderCurrencies(["USD", "UZS", "EUR", "USD", ""])).toEqual(["UZS", "EUR", "USD"]);
  });
});
