import { describe, expect, it } from "vitest";
import { can } from "./capabilities";

describe("can() — capability matrix (TZ §4.4)", () => {
  it("only Direktor edits company settings", () => {
    expect(can("direktor", "settings.company")).toBe(true);
    expect(can("orinbosar", "settings.company")).toBe(false);
    expect(can("hr", "settings.company")).toBe(false);
  });

  it("Direktor and O'rinbosar can assign positions", () => {
    expect(can("direktor", "users.assign_position")).toBe(true);
    expect(can("orinbosar", "users.assign_position")).toBe(true);
    expect(can("hr", "users.assign_position")).toBe(false);
  });

  it("HR can manage employees/documents but not departments", () => {
    expect(can("hr", "employees.create")).toBe(true);
    expect(can("hr", "employees.archive")).toBe(true);
    expect(can("hr", "hr.documents")).toBe(true);
    expect(can("hr", "departments.manage")).toBe(false);
  });

  it("tasks.assign denies mutaxassis / hr / kontragent", () => {
    expect(can("direktor", "tasks.assign")).toBe(true);
    expect(can("orinbosar", "tasks.assign")).toBe(true);
    expect(can("koordinator", "tasks.assign")).toBe(true);
    expect(can("bolim_boshligi", "tasks.assign")).toBe(true);
    expect(can("bosh_mutaxassis", "tasks.assign")).toBe(true);
    expect(can("yetakchi_mutaxassis", "tasks.assign")).toBe(true);
    expect(can("mutaxassis", "tasks.assign")).toBe(false);
    expect(can("hr", "tasks.assign")).toBe(false);
    expect(can("kontragent", "tasks.assign")).toBe(false);
  });

  it("audit log scopes", () => {
    expect(can("direktor", "audit.view_full")).toBe(true);
    expect(can("orinbosar", "audit.view_full")).toBe(true);
    expect(can("hr", "audit.view_full")).toBe(false);
    expect(can("hr", "audit.view_hr")).toBe(true);
  });

  it("only managers approve contractors", () => {
    expect(can("direktor", "contractors.approve")).toBe(true);
    expect(can("orinbosar", "contractors.approve")).toBe(true);
    expect(can("koordinator", "contractors.approve")).toBe(true);
    expect(can("bolim_boshligi", "contractors.approve")).toBe(false);
    expect(can("hr", "contractors.approve")).toBe(false);
  });

  it("contractor cannot view employee registry", () => {
    expect(can("kontragent", "employees.view_all")).toBe(false);
  });
});
