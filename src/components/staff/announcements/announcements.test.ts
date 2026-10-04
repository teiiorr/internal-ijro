import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

// audience.ts DB singletonini import qiladi — testda hech qachon ulanmasin.
vi.mock("@/lib/db", () => ({ db: {} }));

import {
  audienceSchema,
  audienceVisibleSql,
  audienceWithinAllowed,
  describeAudience,
  type Audience,
} from "@/lib/audience";
import { announcements } from "@/lib/db/tables/announcements";
import {
  canManageAnnouncement,
  canPostAnnouncements,
  canSeeReceipts,
  chunk,
  endOfDayTashkent,
  errorKey,
  isPollClosed,
  isYmd,
  makeExcerpt,
  normalizePollOptions,
  percent,
  remindedTooRecently,
  tashkentYmd,
  todayTashkentYmd,
  validateVoteSelection,
} from "./logic";

const D1 = "11111111-1111-4111-8111-111111111111";
const D2 = "22222222-2222-4222-8222-222222222222";
const U1 = "33333333-3333-4333-8333-333333333333";
const U2 = "44444444-4444-4444-8444-444444444444";

describe("audienceSchema", () => {
  it("accepts the four shapes", () => {
    expect(audienceSchema.safeParse({ all: true }).success).toBe(true);
    expect(audienceSchema.safeParse({ departmentIds: [D1] }).success).toBe(true);
    expect(audienceSchema.safeParse({ positions: ["hr", "mutaxassis"] }).success).toBe(true);
    expect(audienceSchema.safeParse({ userIds: [U1, U2] }).success).toBe(true);
  });

  it("rejects mixed / extra keys, empty arrays, kontragent and garbage", () => {
    expect(audienceSchema.safeParse({ all: true, departmentIds: [D1] }).success).toBe(false);
    expect(audienceSchema.safeParse({ all: false }).success).toBe(false);
    expect(audienceSchema.safeParse({ departmentIds: [] }).success).toBe(false);
    expect(audienceSchema.safeParse({ positions: ["kontragent"] }).success).toBe(false);
    expect(audienceSchema.safeParse({ userIds: ["not-a-uuid"] }).success).toBe(false);
    expect(audienceSchema.safeParse(null).success).toBe(false);
    expect(audienceSchema.safeParse({}).success).toBe(false);
  });

  it("caps arrays at 200 ids", () => {
    const ids = Array.from({ length: 201 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    expect(audienceSchema.safeParse({ userIds: ids }).success).toBe(false);
    expect(audienceSchema.safeParse({ userIds: ids.slice(0, 200) }).success).toBe(true);
  });

  it("dedupes and lower-cases ids", () => {
    const r = audienceSchema.parse({ departmentIds: [D1.toUpperCase(), D1] });
    expect(r).toEqual({ departmentIds: [D1] });
    expect(audienceSchema.parse({ positions: ["hr", "hr"] })).toEqual({ positions: ["hr"] });
  });
});

describe("audienceWithinAllowed (canSendToAudience core)", () => {
  it("'any' roles can send anything", () => {
    expect(audienceWithinAllowed("any", { all: true })).toBe(true);
    expect(audienceWithinAllowed("any", { positions: ["hr"] })).toBe(true);
  });

  it("limited roles: own departments only, never all/positions", () => {
    expect(audienceWithinAllowed([D1], { departmentIds: [D1] })).toBe(true);
    expect(audienceWithinAllowed([D1], { departmentIds: [D1, D2] })).toBe(false);
    expect(audienceWithinAllowed([D1], { departmentIds: [] })).toBe(false);
    expect(audienceWithinAllowed([D1], { all: true })).toBe(false);
    expect(audienceWithinAllowed([D1], { positions: ["mutaxassis"] })).toBe(false);
    expect(audienceWithinAllowed([], { departmentIds: [D1] })).toBe(false);
  });

  it("koordinator with several departments", () => {
    expect(audienceWithinAllowed([D1, D2], { departmentIds: [D2, D1] })).toBe(true);
  });

  it("userIds must all sit inside allowed departments", () => {
    const a: Audience = { userIds: [U1, U2] };
    expect(audienceWithinAllowed([D1], a, [D1, D1])).toBe(true);
    expect(audienceWithinAllowed([D1], a, [D1, D2])).toBe(false);
    expect(audienceWithinAllowed([D1], a, [D1, null])).toBe(false);
    // bitta foydalanuvchi topilmadi
    expect(audienceWithinAllowed([D1], a, [D1])).toBe(false);
  });
});

describe("audienceVisibleSql", () => {
  const dialect = new PgDialect();

  it("uses jsonb_exists (no ? operator) and binds me as params", () => {
    const q = dialect.sqlToQuery(
      audienceVisibleSql(announcements.audience, { id: U1, position: "mutaxassis", departmentId: D1 })
    );
    expect(q.sql).toContain(`"announcements"."audience"->>'all'`);
    expect(q.sql).toContain("jsonb_exists(");
    expect(q.sql).not.toMatch(/\s\?\s/);
    expect(q.sql).toMatch(/^coalesce\(/);
    expect(q.params).toEqual(["mutaxassis", U1, D1]);
    expect(q.sql).toContain("'departmentIds'");
  });

  it("omits the department clause when the user has no department", () => {
    const q = dialect.sqlToQuery(
      audienceVisibleSql(announcements.audience, { id: U1, position: "hr", departmentId: null })
    );
    expect(q.params).toEqual(["hr", U1]);
    expect(q.sql).not.toContain("'departmentIds'");
  });
});

describe("describeAudience", () => {
  const t = (k: string) => `[${k}]`;
  const depts = new Map([[D1, "Moliya"]]);
  it("renders each shape", () => {
    expect(describeAudience({ all: true }, depts, t)).toBe("[audienceAll]");
    expect(describeAudience({ departmentIds: [D1, D2] }, depts, t)).toBe("[audienceDepartments]: Moliya, —");
    expect(describeAudience({ positions: ["hr", "direktor"] }, depts, t)).toBe(
      "[audiencePositions]: [positions.hr], [positions.direktor]"
    );
    expect(describeAudience({ userIds: [U1, U2] }, depts, t)).toBe("[audiencePeople]: 2");
  });
});

describe("dates (Tashkent)", () => {
  it("validates YYYY-MM-DD", () => {
    expect(isYmd("2026-10-05")).toBe(true);
    expect(isYmd("2026-02-30")).toBe(false);
    expect(isYmd("2026-1-5")).toBe(false);
    expect(isYmd("")).toBe(false);
    expect(isYmd(null)).toBe(false);
  });

  it("end of day is 23:59:59.999 +05:00", () => {
    expect(endOfDayTashkent("2026-10-05").toISOString()).toBe("2026-10-05T18:59:59.999Z");
  });

  it("round-trips through tashkentYmd", () => {
    expect(tashkentYmd(endOfDayTashkent("2026-12-31"))).toBe("2026-12-31");
    // 20:30 UTC = ertasi kun 01:30 Toshkent
    expect(tashkentYmd(new Date("2026-10-05T20:30:00Z"))).toBe("2026-10-06");
    expect(todayTashkentYmd(new Date("2026-10-05T18:59:00Z"))).toBe("2026-10-05");
  });

  it("poll closes at closes_at", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    expect(isPollClosed(null, now)).toBe(false);
    expect(isPollClosed(new Date("2026-10-05T12:00:01Z"), now)).toBe(false);
    expect(isPollClosed(new Date("2026-10-05T11:59:59Z"), now)).toBe(true);
  });

  it("12h reminder throttle", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    expect(remindedTooRecently(null, now)).toBe(false);
    expect(remindedTooRecently(new Date("2026-10-05T01:00:00Z"), now)).toBe(true);
    expect(remindedTooRecently(new Date("2026-10-04T23:59:59Z"), now)).toBe(false);
  });
});

describe("makeExcerpt", () => {
  it("strips markdown syntax", () => {
    const md = "# Sarlavha\n\n**Muhim:** [havola](https://x.uz) va `kod`\n\n- birinchi\n- ikkinchi\n\n> iqtibos";
    expect(makeExcerpt(md)).toBe("Sarlavha Muhim: havola va kod birinchi ikkinchi iqtibos");
  });

  it("truncates on a word boundary with an ellipsis", () => {
    const long = "soʻz ".repeat(200);
    const out = makeExcerpt(long, 280);
    expect(out.length).toBeLessThanOrEqual(281);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });

  it("handles empty input", () => {
    expect(makeExcerpt(null)).toBe("");
    expect(makeExcerpt("   ")).toBe("");
  });
});

describe("poll helpers", () => {
  it("normalizes options: trims, drops blanks and case-insensitive duplicates", () => {
    expect(normalizePollOptions(["  Ha ", "", "ha", "Yoʻq", "  "])).toEqual(["Ha", "Yoʻq"]);
  });

  it("single choice accepts exactly one option", () => {
    const valid = ["a", "b", "c"];
    expect(validateVoteSelection({ multi: false, optionIds: ["a"], validOptionIds: valid })).toBeNull();
    expect(validateVoteSelection({ multi: false, optionIds: ["a", "b"], validOptionIds: valid })).toBe("single_choice");
    expect(validateVoteSelection({ multi: false, optionIds: [], validOptionIds: valid })).toBe("no_option");
    // takror bitta deb hisoblanadi
    expect(validateVoteSelection({ multi: false, optionIds: ["a", "a"], validOptionIds: valid })).toBeNull();
  });

  it("multi choice accepts several, but only this poll's options", () => {
    const valid = ["a", "b", "c"];
    expect(validateVoteSelection({ multi: true, optionIds: ["a", "c"], validOptionIds: valid })).toBeNull();
    expect(validateVoteSelection({ multi: true, optionIds: ["a", "zzz"], validOptionIds: valid })).toBe("invalid_option");
  });

  it("percent and chunk", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(5, 0)).toBe(0);
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe("RBAC helpers", () => {
  const me = (position: string, id = U1, email = "x@bkrm.uz") => ({ id, position, email });

  it("who can post", () => {
    for (const p of ["direktor", "orinbosar", "hr", "bolim_boshligi", "koordinator"]) {
      expect(canPostAnnouncements(me(p))).toBe(true);
    }
    for (const p of ["mutaxassis", "bosh_mutaxassis", "yetakchi_mutaxassis", "kontragent"]) {
      expect(canPostAnnouncements(me(p))).toBe(false);
    }
    expect(canPostAnnouncements(me("mutaxassis", U1, "murodxojayev.baxtiyorxoja@bkrm.uz"))).toBe(true);
  });

  it("manage = author, direktor, owner", () => {
    expect(canManageAnnouncement(me("bolim_boshligi"), U1)).toBe(true);
    expect(canManageAnnouncement(me("bolim_boshligi"), U2)).toBe(false);
    expect(canManageAnnouncement(me("direktor"), U2)).toBe(true);
    expect(canManageAnnouncement(me("orinbosar"), U2)).toBe(false);
    expect(canManageAnnouncement(me("hr"), null)).toBe(false);
  });

  it("receipts = author, direktor, orinbosar, hr", () => {
    expect(canSeeReceipts(me("koordinator"), U1)).toBe(true);
    expect(canSeeReceipts(me("koordinator"), U2)).toBe(false);
    expect(canSeeReceipts(me("orinbosar"), U2)).toBe(true);
    expect(canSeeReceipts(me("hr"), U2)).toBe(true);
    expect(canSeeReceipts(me("mutaxassis"), U2)).toBe(false);
    expect(canSeeReceipts(me("kontragent", U2), U2)).toBe(false);
  });

  it("error codes map to translation keys", () => {
    expect(errorKey("forbidden_audience")).toBe("forbiddenAudience");
    expect(errorKey("too_soon")).toBe("tooSoon");
    expect(errorKey("something_else")).toBe("errors.generic");
    expect(errorKey(undefined)).toBe("errors.generic");
  });
});
