import { describe, expect, it, vi } from "vitest";

// file-access DB singletonini import qiladi; tekshirilayotgan tarmoqlar DB'ga murojaat qilmaydi.
// Topşiriq fayllari tarmoği uçun: studiya ijroçi bölsa bitta qator, aks holda böş.
const { assigneeRows } = vi.hoisted(() => ({ assigneeRows: [] as { u: string }[] }));
vi.mock("@/lib/db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: async () => assigneeRows }) }) }) },
}));

import { canAccessFile, type FileAccessUser } from "./file-access";

const staff: FileAccessUser = { id: "11111111-1111-4111-8111-111111111111", email: "a@company.uz", position: "mutaxassis" };
const studio: FileAccessUser = { id: "22222222-2222-4222-8222-222222222222", email: "s@studio.uz", position: "kontragent" };

describe("canAccessFile: internal-docs", () => {
  it("lets any internal employee read internal documents", async () => {
    expect(await canAccessFile(staff, ["internal-docs", "abc.docx"])).toBe(true);
    expect(await canAccessFile({ ...staff, position: "hr" }, ["internal-docs", "abc.pdf"])).toBe(true);
  });

  it("never lets a studio (kontragent) read them", async () => {
    expect(await canAccessFile(studio, ["internal-docs", "abc.docx"])).toBe(false);
    expect(await canAccessFile(studio, ["INTERNAL-DOCS", "abc.docx"])).toBe(false);
  });
});

describe("canAccessFile: task attachments and responses", () => {
  const TASK = "33333333-3333-4333-8333-333333333333";

  it("lets internal employees read them", async () => {
    expect(await canAccessFile(staff, ["task-attachments", TASK, "a.pdf"])).toBe(true);
    expect(await canAccessFile(staff, ["task-responses", TASK, "b.docx"])).toBe(true);
  });

  it("lets a studio read them only for a task assigned to it", async () => {
    assigneeRows.length = 0;
    expect(await canAccessFile(studio, ["task-attachments", TASK, "a.pdf"])).toBe(false);
    assigneeRows.push({ u: studio.id });
    expect(await canAccessFile(studio, ["task-attachments", TASK, "a.pdf"])).toBe(true);
    expect(await canAccessFile(studio, ["task-responses", TASK, "b.docx"])).toBe(true);
    assigneeRows.length = 0;
  });

  it("rejects a studio request without a valid task id", async () => {
    assigneeRows.push({ u: studio.id });
    expect(await canAccessFile(studio, ["task-attachments", "not-a-uuid", "a.pdf"])).toBe(false);
    assigneeRows.length = 0;
  });
});
