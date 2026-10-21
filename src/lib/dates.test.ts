import { describe, expect, it } from "vitest";
import { formatShortDate, formatTime, monthShort, tashkentDayKey } from "./dates";

describe("monthShort", () => {
  it("gives the same short names on server and browser for every locale", () => {
    expect(monthShort(9, "uz-latn")).toBe("okt");
    expect(monthShort(9, "oz")).toBe("okt");
    expect(monthShort(9, "uz-cyrl")).toBe("окт");
    expect(monthShort(4, "ru")).toBe("мая");
    expect(monthShort(8, "ru")).toBe("сент.");
  });

  it("falls back to Uzbek Latin and wraps the index", () => {
    expect(monthShort(0, "en")).toBe("yan");
    expect(monthShort(12, "uz-latn")).toBe("yan");
    expect(monthShort(-1, "uz-latn")).toBe("dek");
  });
});

describe("formatShortDate", () => {
  it("formats by Tashkent date, not by the server or browser time zone", () => {
    // 2026-10-11 20:00 UTC = 2026-10-12 01:00 Toşkent
    expect(formatShortDate("2026-10-11T20:00:00Z", "uz-latn")).toBe("12-okt");
    expect(formatShortDate("2026-10-11T18:59:00Z", "uz-latn")).toBe("11-okt");
  });

  it("uses each locale's own pattern", () => {
    const d = new Date("2026-05-05T00:00:00Z");
    expect(formatShortDate(d, "uz-latn")).toBe("5-may");
    expect(formatShortDate(d, "oz")).toBe("5-may");
    expect(formatShortDate(d, "uz-cyrl")).toBe("5-май");
    expect(formatShortDate(d, "ru")).toBe("5 мая");
  });

  it("never prints the ICU fallback like 'M10'", () => {
    for (let m = 0; m < 12; m++) {
      const s = formatShortDate(new Date(Date.UTC(2026, m, 15)), "uz-latn");
      expect(s).not.toMatch(/M\d/);
    }
  });
});

describe("formatTime and tashkentDayKey", () => {
  it("prints Tashkent hours even when the server runs in UTC", () => {
    expect(formatTime("2026-10-21T09:05:00Z")).toBe("14:05");
    expect(formatTime("2026-10-21T19:30:00Z")).toBe("00:30");
  });

  it("groups messages by Tashkent day", () => {
    expect(tashkentDayKey("2026-10-21T18:59:00Z")).toBe("2026-10-21");
    expect(tashkentDayKey("2026-10-21T19:00:00Z")).toBe("2026-10-22");
  });
});
