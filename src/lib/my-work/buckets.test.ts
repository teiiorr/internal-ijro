import { describe, expect, it } from "vitest";
import { addDays, bucketOf, countByDay, endOfTashkentDay, isIsoDate, todayTashkent, weekDays } from "./buckets";

describe("todayTashkent", () => {
  it("UTC kunini Toshkent kuniga oʻtkazadi (+05:00)", () => {
    // 2026-10-04 19:00 UTC = 2026-10-05 00:00 Toshkent
    expect(todayTashkent(new Date("2026-10-04T19:00:00Z"))).toBe("2026-10-05");
    // 2026-10-04 18:59 UTC = 2026-10-04 23:59 Toshkent
    expect(todayTashkent(new Date("2026-10-04T18:59:59Z"))).toBe("2026-10-04");
    expect(todayTashkent(new Date("2026-10-05T00:00:00Z"))).toBe("2026-10-05");
  });
});

describe("weekDays", () => {
  it("dushanbadan yakshanbagacha 7 kunni qaytaradi", () => {
    // 2026-10-05 — dushanba
    expect(weekDays("2026-10-05")).toEqual([
      "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11",
    ]);
  });
  it("yakshanba joriy haftaga tegishli (ISO hafta)", () => {
    expect(weekDays("2026-10-11")[0]).toBe("2026-10-05");
    expect(weekDays("2026-10-11")[6]).toBe("2026-10-11");
  });
  it("oy va yil chegarasidan oʻtadi", () => {
    // 2026-12-31 — payshanba
    expect(weekDays("2026-12-31")).toEqual([
      "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03",
    ]);
  });
});

describe("bucketOf", () => {
  const today = "2026-10-07"; // chorshanba
  it("sanasiz va yaroqsiz qiymatlar", () => {
    expect(bucketOf(null, today)).toBe("nodate");
    expect(bucketOf("", today)).toBe("nodate");
    expect(bucketOf("2026-02-30", today)).toBe("nodate");
  });
  it("muddati oʻtgan / bugun / ertaga", () => {
    expect(bucketOf("2026-10-05", today)).toBe("overdue");
    expect(bucketOf("2026-10-06", today)).toBe("overdue");
    expect(bucketOf("2026-10-07", today)).toBe("today");
    expect(bucketOf("2026-10-08", today)).toBe("tomorrow");
  });
  it("shu hafta — yakshanbagacha, keyin — keyinroq", () => {
    expect(bucketOf("2026-10-09", today)).toBe("week");
    expect(bucketOf("2026-10-11", today)).toBe("week");
    expect(bucketOf("2026-10-12", today)).toBe("later");
  });
  it("yakshanba kuni ertaga keyingi haftaning dushanbasi", () => {
    expect(bucketOf("2026-10-12", "2026-10-11")).toBe("tomorrow");
    expect(bucketOf("2026-10-13", "2026-10-11")).toBe("later");
  });
  it("shanba kuni 'shu hafta' boʻsh qoladi", () => {
    expect(bucketOf("2026-10-11", "2026-10-10")).toBe("tomorrow");
    expect(bucketOf("2026-10-12", "2026-10-10")).toBe("later");
  });
  it("vaqt qismi boʻlsa ham faqat sana hisobga olinadi", () => {
    expect(bucketOf("2026-10-07T10:00:00", today)).toBe("today");
  });
});

describe("countByDay", () => {
  it("faqat berilgan kunlarni sanaydi", () => {
    const days = weekDays("2026-10-05");
    const res = countByDay(
      [
        { date: "2026-10-05" },
        { date: "2026-10-05" },
        { date: "2026-10-11" },
        { date: "2026-10-12" },
        { date: null },
      ],
      days,
    );
    expect(res["2026-10-05"]).toBe(2);
    expect(res["2026-10-11"]).toBe(1);
    expect(res["2026-10-06"]).toBe(0);
    expect(Object.keys(res)).toHaveLength(7);
    expect(res["2026-10-12"]).toBeUndefined();
  });
});

describe("yordamchilar", () => {
  it("addDays", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("isIsoDate", () => {
    expect(isIsoDate("2026-10-05")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("05.10.2026")).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });
  it("endOfTashkentDay Toshkent kunining oxiri", () => {
    expect(new Date(endOfTashkentDay("2026-10-05")).toISOString()).toBe("2026-10-05T18:59:59.000Z");
  });
});
