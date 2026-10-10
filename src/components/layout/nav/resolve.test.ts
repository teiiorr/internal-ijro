import { describe, expect, it } from "vitest";
import type { Position } from "@/lib/db/schema";
import { STAFF_NAV } from "./staff-nav";
import { activeKey, resolveNav, visibleItems } from "./resolve";
import { isGroup, type NavFlags, type NavViewer } from "./types";

const viewer = (position: Position, isOwner = false, flags: Partial<NavFlags> = {}): NavViewer => ({
  position,
  isOwner,
  flags: { contractors: false, money: false, reports: false, ...flags },
});

const topKeys = (v: NavViewer) =>
  resolveNav(STAFF_NAV, v).map((e) => (e.type === "group" ? e.group.key : e.item.key));

describe("resolveNav — guruhlar va ko'rinish", () => {
  it("bo'sh guruh yashiriladi, bitta bolali guruh havolaga aylanadi", () => {
    // mutaxassis: admin guruhi (reports/audit/owner) hammasi yopiq → yashirin;
    // team guruhi faqat "directory" (tuzilma) qoladi → havolaga aylanadi.
    const r = resolveNav(STAFF_NAV, viewer("mutaxassis"));
    const adminEntry = r.find((e) => (e.type === "group" ? e.group.key : e.groupKey) === "admin");
    expect(adminEntry).toBeUndefined();
    const team = r.find((e) => e.type === "link" && e.groupKey === "team");
    expect(team && team.type === "link" && team.item.key).toBe("directory");
  });

  it("direktor: 7 ta yuqori daraja (barcha guruhlar)", () => {
    const keys = topKeys(viewer("direktor", false, { contractors: true, money: true, reports: true }));
    expect(keys).toEqual(["dashboard", "work", "projects", "councils", "team", "info", "admin"]);
  });

  it("mutaxassis: boshqaruv yo'q, team va admin yig'iladi", () => {
    const keys = topKeys(viewer("mutaxassis"));
    // dashboard, work, projects, councils, team(→directory link), info; admin yo'q
    expect(keys).toContain("work");
    expect(keys).toContain("councils");
    expect(keys).not.toContain("admin");
    expect(keys).toContain("info");
  });

  it("hr: tasks/taskControl yo'q (STAFF), employees ko'rinadi", () => {
    const r = resolveNav(STAFF_NAV, viewer("hr"));
    const items = visibleItems(r).map((i) => i.key);
    expect(items).not.toContain("tasks");
    expect(items).not.toContain("taskControl");
    expect(items).toContain("employees");
    expect(items).toContain("myWork");
  });

  it("owner (mutaxassis lavozimda): admin guruhi va owner paneli ham ko'rinadi", () => {
    const keys = topKeys(viewer("mutaxassis", true, { contractors: true, money: true, reports: true }));
    expect(keys).toContain("admin");
    const items = visibleItems(resolveNav(STAFF_NAV, viewer("mutaxassis", true, { reports: true }))).map((i) => i.key);
    expect(items).toContain("owner");
  });
});

describe("activeKey — eng uzun mos prefiks", () => {
  const v = viewer("direktor", false, { contractors: true, money: true, reports: true });
  const items = visibleItems(resolveNav(STAFF_NAV, v));

  it("/tasks/control → taskControl (/tasks'dan uzunroq)", () => {
    expect(activeKey("/tasks/control", items, v)).toBe("taskControl");
  });
  it("/projects/payments → payments", () => {
    expect(activeKey("/projects/payments", items, v)).toBe("payments");
  });
  it("/projects/timeline va /projects/123 → allProjects", () => {
    expect(activeKey("/projects/timeline", items, v)).toBe("allProjects");
    expect(activeKey("/projects/123", items, v)).toBe("allProjects");
  });
  it("/contractors/requests → studios; /kengashlar/ijro → councilResolutions", () => {
    expect(activeKey("/contractors/requests", items, v)).toBe("studios");
    expect(activeKey("/kengashlar/ijro", items, v)).toBe("councilResolutions");
  });
  it("/reports/slippage → reports", () => {
    expect(activeKey("/reports/slippage", items, v)).toBe("reports");
  });
  it("mos kelmasa — null", () => {
    expect(activeKey("/settings", items, v)).toBeNull();
  });
});

describe("activeKey — fallbackMatch", () => {
  it("non-HR xodim uchun /employees/123 → directory (tuzilma)", () => {
    const v = viewer("mutaxassis");
    const items = visibleItems(resolveNav(STAFF_NAV, v));
    expect(items.some((i) => i.key === "employees")).toBe(false);
    expect(activeKey("/employees/123", items, v)).toBe("directory");
  });
  it("HR uchun /employees/123 → employees (fallback emas)", () => {
    const v = viewer("hr");
    const items = visibleItems(resolveNav(STAFF_NAV, v));
    expect(activeKey("/employees/123", items, v)).toBe("employees");
  });
});

// isGroup type guard ishlatilishini tasdiqlash (import ishlatilmay qolmasin).
describe("isGroup", () => {
  it("guruhni ajratadi", () => {
    const g = STAFF_NAV.entries.find((e) => isGroup(e));
    expect(g && isGroup(g)).toBe(true);
  });
});
