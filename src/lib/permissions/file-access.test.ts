import { describe, expect, it, vi } from "vitest";

// file-access DB singletonini import qiladi; tekshirilayotgan tarmoqlar DB'ga murojaat qilmaydi.
vi.mock("@/lib/db", () => ({ db: {} }));

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
