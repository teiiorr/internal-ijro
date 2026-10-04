import { describe, expect, it } from "vitest";
import type { Position } from "@/lib/db/schema";
import {
  MAX_TREE_DEPTH,
  buildOrgTree,
  buildVCard,
  deptName,
  escapeVCard,
  flattenTree,
  fmtDdMm,
  foldVCardLine,
  latinizeFileName,
  normalizeSkills,
  normalizeTelegram,
  sortDirectory,
  splitFullName,
  tashkentToday,
  toAwayKind,
  type DeptInput,
  type PersonInput,
} from "./logic";
import { cardErrorCode, contactCardSchema } from "./card-schema";

const person = (id: string, position: Position, departmentId: string | null, extra: Partial<PersonInput> = {}): PersonInput => ({
  id,
  fullName: `Xodim ${id}`,
  avatarUrl: null,
  position,
  positionTitle: null,
  departmentId,
  awayToday: false,
  ...extra,
});

const dept = (id: string, parentDepartmentId: string | null = null, headUserId: string | null = null): DeptInput => ({
  id,
  name: `Boʻlim ${id}`,
  parentDepartmentId,
  headUserId,
});

describe("dates", () => {
  it("uses the Tashkent calendar day (UTC+5)", () => {
    expect(tashkentToday(new Date("2026-10-11T18:59:00Z"))).toBe("2026-10-11");
    expect(tashkentToday(new Date("2026-10-11T19:00:00Z"))).toBe("2026-10-12");
  });
  it("formats DD.MM for the away chip", () => {
    expect(fmtDdMm("2026-10-12")).toBe("12.10");
    expect(fmtDdMm(null)).toBe("");
    expect(fmtDdMm("garbage")).toBe("");
  });
});

describe("toAwayKind", () => {
  it("never reveals the leave type to non-HR viewers", () => {
    expect(toAwayKind("sick", false)).toBe("away");
    expect(toAwayKind("vacation", false)).toBe("away");
  });
  it("shows the type to HR, mapping unknown types to other", () => {
    expect(toAwayKind("sick", true)).toBe("sick");
    expect(toAwayKind("unpaid", true)).toBe("unpaid");
    expect(toAwayKind("weird", true)).toBe("other");
    expect(toAwayKind(null, true)).toBe("other");
  });
});

describe("deptName", () => {
  const d = { name: "Raw", nameUzLatn: "Lotin", nameUzCyrl: "Кирилл", nameRu: "Русский" };
  it("picks the localized column", () => {
    expect(deptName(d, "uz-cyrl")).toBe("Кирилл");
    expect(deptName(d, "ru")).toBe("Русский");
    expect(deptName(d, "uz-latn")).toBe("Lotin");
    expect(deptName(d, "oz")).toBe("Lotin");
  });
  it("falls back to uz-latn, then name", () => {
    expect(deptName({ name: "Raw", nameUzLatn: "Lotin", nameRu: null }, "ru")).toBe("Lotin");
    expect(deptName({ name: "Raw" }, "ru")).toBe("Raw");
    expect(deptName({ name: "Raw", nameUzLatn: "  " }, "uz-latn")).toBe("Raw");
  });
});

describe("sortDirectory", () => {
  it("orders by department, then position level, then name; no department last", () => {
    const rows = [
      { id: "1", departmentName: null, position: "direktor" as Position, fullName: "A" },
      { id: "2", departmentName: "Bölim B", position: "mutaxassis" as Position, fullName: "A" },
      { id: "3", departmentName: "Bölim A", position: "mutaxassis" as Position, fullName: "Z" },
      { id: "4", departmentName: "Bölim A", position: "bolim_boshligi" as Position, fullName: "Y" },
      { id: "5", departmentName: "Bölim A", position: "mutaxassis" as Position, fullName: "B" },
    ];
    expect(sortDirectory(rows).map((r) => r.id)).toEqual(["4", "5", "3", "2", "1"]);
  });
});

describe("buildOrgTree", () => {
  it("nests departments, picks heads, coordinators, members and counts", () => {
    const tree = buildOrgTree({
      departments: [dept("root", null, "h1"), dept("child", "root", null)],
      people: [
        person("dir", "direktor", null),
        person("orin", "orinbosar", "root"),
        person("h1", "bolim_boshligi", "root"),
        person("m1", "mutaxassis", "root", { awayToday: true }),
        person("m2", "bosh_mutaxassis", "root"),
        person("c1", "koordinator", "child"),
        person("u1", "mutaxassis", null),
      ],
      coordinators: [
        { departmentId: "root", userId: "c1" },
        { departmentId: "root", userId: "c1" }, // takror
        { departmentId: "root", userId: "ghost" }, // yashirin / arxivlangan
      ],
    });

    expect(tree.leadership.map((p) => p.id)).toEqual(["dir", "orin"]);
    expect(tree.unassigned.map((p) => p.id)).toEqual(["u1"]);
    expect(tree.departments).toHaveLength(1);
    const root = tree.departments[0];
    expect(root.head?.id).toBe("h1");
    expect(root.members.map((p) => p.id)).toEqual(["m2", "m1"]); // daraja boʻyicha
    expect(root.memberCount).toBe(3);
    expect(root.awayToday).toBe(1);
    expect(root.coordinators.map((p) => p.id)).toEqual(["c1"]);
    expect(root.children.map((c) => c.id)).toEqual(["child"]);
    expect(root.children[0].head).toBeNull();
    expect(root.children[0].memberCount).toBe(1);
  });

  it("does not list a head twice and keeps a head from another department out of unassigned", () => {
    const tree = buildOrgTree({
      departments: [dept("a", null, "boss")],
      people: [person("boss", "bolim_boshligi", null), person("x", "mutaxassis", "a")],
      coordinators: [],
    });
    expect(tree.unassigned).toEqual([]);
    expect(tree.departments[0].head?.id).toBe("boss");
    expect(tree.departments[0].members.map((p) => p.id)).toEqual(["x"]);
    expect(tree.departments[0].memberCount).toBe(2);
  });

  it("treats an inactive/hidden head (not in people) as no head", () => {
    const tree = buildOrgTree({ departments: [dept("a", null, "gone")], people: [], coordinators: [] });
    expect(tree.departments[0].head).toBeNull();
    expect(tree.departments[0].memberCount).toBe(0);
  });

  it("terminates on cyclic parent_department_id data and keeps every department", () => {
    const tree = buildOrgTree({
      departments: [dept("a", "b"), dept("b", "c"), dept("c", "a"), dept("self", "self")],
      people: [],
      coordinators: [],
    });
    const ids = flattenTree(tree.departments).map((x) => x.node.id);
    expect(ids.sort()).toEqual(["a", "b", "c", "self"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("caps nesting depth and promotes deeper departments instead of dropping them", () => {
    const n = MAX_TREE_DEPTH + 5;
    const departments: DeptInput[] = Array.from({ length: n }, (_, i) =>
      dept(`d${String(i).padStart(2, "0")}`, i === 0 ? null : `d${String(i - 1).padStart(2, "0")}`)
    );
    const tree = buildOrgTree({ departments, people: [], coordinators: [] });
    const flat = flattenTree(tree.departments);
    expect(flat).toHaveLength(n);
    expect(Math.max(...flat.map((x) => x.depth))).toBe(MAX_TREE_DEPTH - 1);
    expect(tree.departments.length).toBeGreaterThan(1);
  });

  it("treats a parent pointing to a missing department as a root", () => {
    const tree = buildOrgTree({ departments: [dept("a", "missing")], people: [], coordinators: [] });
    expect(tree.departments.map((d) => d.id)).toEqual(["a"]);
  });
});

describe("contact card normalization", () => {
  it("strips @ and t.me links from telegram usernames", () => {
    expect(normalizeTelegram("@baxtiyor_dev")).toBe("baxtiyor_dev");
    expect(normalizeTelegram("  https://t.me/baxtiyor_dev ")).toBe("baxtiyor_dev");
    expect(normalizeTelegram("")).toBe("");
  });
  it("lowercases, trims and dedupes skills", () => {
    expect(normalizeSkills(["  Dublyaj ", "dublyaj", "Montaj  video", "", "MONTAJ VIDEO"])).toEqual([
      "dublyaj",
      "montaj video",
    ]);
  });
});

describe("contactCardSchema", () => {
  it("accepts a valid card and normalizes values", () => {
    const r = contactCardSchema.parse({
      workPhone: " +998 (71) 200-00-00 ",
      internalExt: "123",
      room: "305",
      telegramUsername: "@Baxtiyor_dev",
      bio: "",
      skills: ["Dublyaj", "dublyaj "],
      showMobile: true,
      mobile: "+998901234567",
    });
    expect(r.workPhone).toBe("+998 (71) 200-00-00");
    expect(r.telegramUsername).toBe("Baxtiyor_dev");
    expect(r.bio).toBeNull();
    expect(r.skills).toEqual(["dublyaj"]);
  });
  it("keeps undefined fields untouched and clears empty ones", () => {
    const r = contactCardSchema.parse({ room: "", telegramUsername: "" });
    expect(r.workPhone).toBeUndefined();
    expect(r.skills).toBeUndefined();
    expect(r.room).toBeNull();
    expect(r.telegramUsername).toBeNull();
  });
  it("rejects bad telegram usernames and phones", () => {
    const tg = contactCardSchema.safeParse({ telegramUsername: "ab" });
    expect(tg.success).toBe(false);
    if (!tg.success) expect(cardErrorCode(tg.error.issues.map((i) => i.path[0]))).toBe("invalid_telegram");
    const ph = contactCardSchema.safeParse({ mobile: "call me" });
    expect(ph.success).toBe(false);
    if (!ph.success) expect(cardErrorCode(ph.error.issues.map((i) => i.path[0]))).toBe("invalid_phone");
  });
  it("limits skills to 15 items of 40 characters", () => {
    expect(contactCardSchema.safeParse({ skills: Array.from({ length: 16 }, (_, i) => `s${i}`) }).success).toBe(false);
    expect(contactCardSchema.safeParse({ skills: ["x".repeat(41)] }).success).toBe(false);
    expect(contactCardSchema.safeParse({ userId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("vCard", () => {
  it("escapes commas, semicolons, backslashes and newlines", () => {
    expect(escapeVCard("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });
  it("splits Uzbek full names into N parts", () => {
    expect(splitFullName("Murodxoʻjayev Baxtiyor Akmalovich")).toEqual({
      family: "Murodxoʻjayev",
      given: "Baxtiyor",
      additional: "Akmalovich",
    });
    expect(splitFullName("Baxtiyor")).toEqual({ family: "", given: "Baxtiyor", additional: "" });
  });
  it("folds long lines at 75 octets without splitting UTF-8 characters", () => {
    const line = "NOTE:" + "oʻ".repeat(60);
    const folded = foldVCardLine(line);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    expect(parts.map((p, i) => (i === 0 ? p : p.slice(1))).join("")).toBe(line);
  });
  it("builds a valid 3.0 card with mobile only when provided", () => {
    const base = {
      fullName: "Murodxoʻjayev Baxtiyor",
      org: "BKRM",
      department: "Dublyaj, ovoz",
      title: "Bosh mutaxassis",
      email: "b@example.uz",
      workPhone: "+998 71 200 00 00",
      internalExt: "123",
      mobile: null,
      telegramUsername: "baxtiyor_dev",
    };
    const v = buildVCard(base);
    const lines = v.split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCARD");
    expect(lines[1]).toBe("VERSION:3.0");
    expect(v).toContain("N:Murodxoʻjayev;Baxtiyor;;;\r\n");
    expect(v).toContain("FN:Murodxoʻjayev Baxtiyor\r\n");
    expect(v).toContain("ORG:BKRM;Dublyaj\\, ovoz\r\n");
    expect(v).toContain("TITLE:Bosh mutaxassis\r\n");
    expect(v).toContain("EMAIL;TYPE=WORK:b@example.uz\r\n");
    expect(v).toContain("TEL;TYPE=WORK:+998 71 200 00 00 ext. 123\r\n");
    expect(v).toContain("URL:https://t.me/baxtiyor_dev\r\n");
    expect(v).not.toContain("TYPE=CELL");
    expect(v.endsWith("END:VCARD\r\n")).toBe(true);

    expect(buildVCard({ ...base, mobile: "+998901234567" })).toContain("TEL;TYPE=CELL:+998901234567\r\n");
  });
  it("produces ASCII file names", () => {
    expect(latinizeFileName("Murodxoʻjayev Baxtiyor")).toBe("Murodxojayev-Baxtiyor");
    expect(latinizeFileName("Аҳмедов Шоҳрух")).toBe("Ahmedov-Shohrux");
    expect(latinizeFileName("   ")).toBe("contact");
  });
});
