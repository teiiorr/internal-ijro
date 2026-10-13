import { describe, expect, it } from "vitest";
import {
  MONEY_MASK,
  canEditProjects,
  canUploadProjectDocs,
  canViewMoney,
} from "./project-editors";

// The allowlist keys off the surname segment of a corporate e-mail
// (`surname.name@bkrm.uz`). These checks gate project create/edit/delete, the
// project-doc uploaders and money visibility, so the edge cases (null, no "@",
// casing, unknown surname) must never throw and must fail closed.

describe("canEditProjects", () => {
  it("returns false for missing/empty e-mail (fails closed)", () => {
    expect(canEditProjects(null)).toBe(false);
    expect(canEditProjects(undefined)).toBe(false);
    expect(canEditProjects("")).toBe(false);
  });

  it("recognises a listed surname regardless of the name part", () => {
    expect(canEditProjects("murodxojayev.b@bkrm.uz")).toBe(true);
    expect(canEditProjects("yuldashev@bkrm.uz")).toBe(true); // no dotted name part
  });

  it("is case-insensitive on the surname", () => {
    expect(canEditProjects("Murodxojayev.B@BKRM.UZ")).toBe(true);
    expect(canEditProjects("AKROMOV.k@bkrm.uz")).toBe(true);
  });

  it("accepts both x/h spelling variants that are both listed", () => {
    expect(canEditProjects("xasanova@bkrm.uz")).toBe(true);
    expect(canEditProjects("hasanova@bkrm.uz")).toBe(true);
    expect(canEditProjects("madraximov@bkrm.uz")).toBe(true);
    expect(canEditProjects("madrahimov@bkrm.uz")).toBe(true);
  });

  it("rejects an unknown surname", () => {
    expect(canEditProjects("random.person@bkrm.uz")).toBe(false);
  });

  it("does not throw on a malformed address with no '@'", () => {
    expect(canEditProjects("noatsign")).toBe(false);
    expect(canEditProjects("yuldashev")).toBe(true); // bare surname still resolves
  });
});

describe("canUploadProjectDocs", () => {
  it("includes every editor plus the extra uploader allowlist", () => {
    expect(canUploadProjectDocs("murodxojayev.b@bkrm.uz")).toBe(true); // editor
    expect(canUploadProjectDocs("matyakubov.x@bkrm.uz")).toBe(true); // uploader-only
    expect(canUploadProjectDocs("matyoqubov@bkrm.uz")).toBe(true); // spelling variant
  });

  it("rejects everyone else and empty input", () => {
    expect(canUploadProjectDocs("random@bkrm.uz")).toBe(false);
    expect(canUploadProjectDocs(null)).toBe(false);
  });
});

describe("canViewMoney", () => {
  it("mirrors the project-editor allowlist exactly", () => {
    expect(canViewMoney("yuldashev.a@bkrm.uz")).toBe(true);
    expect(canViewMoney("matyakubov@bkrm.uz")).toBe(false); // uploader, not an editor
    expect(canViewMoney("random@bkrm.uz")).toBe(false);
    expect(canViewMoney(null)).toBe(false);
  });

  it("exposes a stable mask for hidden amounts", () => {
    expect(MONEY_MASK).toBe("***");
  });
});
