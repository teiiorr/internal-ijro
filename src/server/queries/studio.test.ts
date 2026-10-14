import { beforeEach, describe, expect, it, vi } from "vitest";

// DB singletoni o'rniga navbatli soxta so'rov quruvchi: har bir yakuniy so'rov (limit yoki
// await) navbatdagi tayyor natijani qaytaradi; Error bo'lsa — rad etadi.
const q = vi.hoisted(() => ({ results: [] as unknown[], calls: 0 }));
vi.mock("@/lib/db", () => {
  const next = () => {
    q.calls++;
    const r = q.results.shift();
    return r instanceof Error ? Promise.reject(r) : Promise.resolve(r ?? []);
  };
  const chain = {
    from: () => chain,
    where: () => ({ limit: () => next(), then: (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => next().then(ok, bad) }),
  };
  return { db: { select: () => chain } };
});

import { projectStudioContactUserIds, studioUserCanAccessProject } from "./studio";

const PROJECT = "11111111-1111-4111-8111-111111111111";
const PRIMARY = "22222222-2222-4222-8222-222222222222";
const SECONDARY = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  q.results = [];
  q.calls = 0;
});

describe("studioUserCanAccessProject", () => {
  it("denies without an email and does not query", async () => {
    expect(await studioUserCanAccessProject(null, PROJECT)).toBe(false);
    expect(await studioUserCanAccessProject("", PROJECT)).toBe(false);
    expect(q.calls).toBe(0);
  });

  it("denies a user that is not any studio's contact", async () => {
    q.results = [[]];
    expect(await studioUserCanAccessProject("staff@tashkilot.uz", PROJECT)).toBe(false);
  });

  it("denies when the project does not exist", async () => {
    q.results = [[{ id: PRIMARY, name: "A" }], []];
    expect(await studioUserCanAccessProject("a@studio.uz", PROJECT)).toBe(false);
  });

  it("allows the primary studio without touching project_studios", async () => {
    q.results = [[{ id: PRIMARY, name: "A" }], [{ ec: PRIMARY }]];
    expect(await studioUserCanAccessProject("a@studio.uz", PROJECT)).toBe(true);
    expect(q.calls).toBe(2);
  });

  it("allows a secondary studio linked through project_studios (the chat bug)", async () => {
    q.results = [[{ id: SECONDARY, name: "B" }], [{ ec: PRIMARY }], [{ projectId: PROJECT }]];
    expect(await studioUserCanAccessProject("b@studio.uz", PROJECT)).toBe(true);
  });

  it("denies a studio that is neither primary nor linked", async () => {
    q.results = [[{ id: SECONDARY, name: "B" }], [{ ec: PRIMARY }], []];
    expect(await studioUserCanAccessProject("b@studio.uz", PROJECT)).toBe(false);
  });

  it("denies (fails closed) when project_studios cannot be read", async () => {
    q.results = [[{ id: SECONDARY, name: "B" }], [{ ec: PRIMARY }], new Error('relation "project_studios" does not exist')];
    expect(await studioUserCanAccessProject("b@studio.uz", PROJECT)).toBe(false);
  });
});

describe("projectStudioContactUserIds", () => {
  it("returns the contacts of the primary and every linked studio", async () => {
    q.results = [
      [{ companyId: PRIMARY }, { companyId: SECONDARY }],
      [{ email: "A@Studio.uz" }, { email: "b@studio.uz" }],
      [{ id: "u-a" }, { id: "u-b" }],
    ];
    expect(await projectStudioContactUserIds(PROJECT, PRIMARY)).toEqual(["u-a", "u-b"]);
  });

  it("falls back to the primary studio when project_studios is missing", async () => {
    q.results = [new Error("no table"), [{ email: "a@studio.uz" }], [{ id: "u-a" }]];
    expect(await projectStudioContactUserIds(PROJECT, PRIMARY)).toEqual(["u-a"]);
  });

  it("returns nothing for a project without studios", async () => {
    q.results = [[]];
    expect(await projectStudioContactUserIds(PROJECT, null)).toEqual([]);
    expect(q.calls).toBe(1);
  });

  it("returns nothing when studios have no contact email", async () => {
    q.results = [[], [{ email: null }]];
    expect(await projectStudioContactUserIds(PROJECT, PRIMARY)).toEqual([]);
  });
});
