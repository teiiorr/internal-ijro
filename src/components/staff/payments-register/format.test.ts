import { describe, expect, it } from "vitest";
import { formatMoney, groupThousands, splitMonth } from "./format";

const THIN = " ";
const NBSP = " ";

describe("money formatting", () => {
  it("groups thousands with a thin no-break space", () => {
    expect(groupThousands(120000000)).toBe(`120${THIN}000${THIN}000`);
    expect(groupThousands(999)).toBe("999");
    expect(groupThousands(1000)).toBe(`1${THIN}000`);
    expect(groupThousands(0)).toBe("0");
  });

  it("keeps cents only when present and handles negatives", () => {
    expect(groupThousands(1234.5)).toBe(`1${THIN}234,50`);
    expect(groupThousands(-2500000)).toBe(`-2${THIN}500${THIN}000`);
    expect(groupThousands(Number.NaN)).toBe("0");
  });

  it("appends the currency with a no-break space", () => {
    expect(formatMoney(120000000, "UZS")).toBe(`120${THIN}000${THIN}000${NBSP}UZS`);
  });

  it("splits month keys", () => {
    expect(splitMonth("2026-10")).toEqual([2026, 10]);
  });
});
