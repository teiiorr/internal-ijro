import { describe, expect, it } from "vitest";
import {
  canDeleteInternalDoc,
  canUseInternalDocs,
  contentDisposition,
  internalDocsPath,
  isInternalDocKind,
  isWordFile,
  isYmd,
  kindFromSlug,
  matchesQuery,
  titleFromFileName,
  urlFileName,
  ymdToDots,
  wordMimeType,
  wordOpenUri,
} from "./logic";

describe("kind slugs", () => {
  it("maps URL segments to kinds and back", () => {
    expect(kindFromSlug("bildirgilar")).toBe("bildirgi");
    expect(kindFromSlug("BUYRUQLAR")).toBe("buyruq");
    expect(kindFromSlug("hujjatlar")).toBeNull();
    expect(kindFromSlug(undefined)).toBeNull();
    expect(internalDocsPath("bildirgi")).toBe("/ichki-hujjatlar/bildirgilar");
    expect(internalDocsPath("buyruq")).toBe("/ichki-hujjatlar/buyruqlar");
    expect(isInternalDocKind("buyruq")).toBe(true);
    expect(isInternalDocKind("buyruqlar")).toBe(false);
  });
});

describe("Word files", () => {
  it("recognises docx, doc and rtf regardless of case", () => {
    expect(isWordFile("Buyruq 15.DOCX")).toBe(true);
    expect(isWordFile("eski.doc")).toBe(true);
    expect(isWordFile("matn.rtf")).toBe(true);
    expect(isWordFile("skan.pdf")).toBe(false);
    expect(isWordFile("docx")).toBe(false);
    expect(isWordFile(null)).toBe(false);
  });

  it("returns the right MIME type", () => {
    expect(wordMimeType("a.docx")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(wordMimeType("a.doc")).toBe("application/msword");
    expect(wordMimeType("a.pdf")).toBe("application/octet-stream");
  });

  it("builds an Office URI that opens Word in read mode", () => {
    expect(wordOpenUri("https://app.example.uz/api/internal-docs/1/word/t/a.docx")).toBe(
      "ms-word:ofv|u|https://app.example.uz/api/internal-docs/1/word/t/a.docx",
    );
  });

  it("encodes the URL file name and strips path characters", () => {
    expect(urlFileName("Buyruq №15.docx")).toBe("Buyruq%20%E2%84%9615.docx");
    expect(urlFileName("../../etc/passwd.docx")).toBe("..%20..%20etc%20passwd.docx");
    expect(urlFileName("   ")).toBe("hujjat.docx");
  });
});

describe("contentDisposition", () => {
  it("keeps the original Unicode name via RFC 5987 with an ASCII fallback", () => {
    const v = contentDisposition("attachment", "Бўйруқ №15.docx");
    expect(v.startsWith('attachment; filename="')).toBe(true);
    expect(v).toContain("filename*=UTF-8''");
    expect(v).toContain(encodeURIComponent("Бўйруқ №15.docx"));
    expect(v).not.toMatch(/[^\x20-\x7e]/);
  });

  it("cannot be broken by quotes or newlines in the name", () => {
    const v = contentDisposition("inline", 'a"b\r\nc.docx');
    expect(v).not.toContain("\r");
    expect(v).not.toContain("\n");
    expect(v.split('"').length).toBe(3);
  });
});

describe("titleFromFileName / isYmd", () => {
  it("derives a readable title from the file name", () => {
    expect(titleFromFileName("Bildirgi_ta'til uchun.docx")).toBe("Bildirgi ta'til uchun");
    expect(titleFromFileName("noext")).toBe("noext");
  });

  it("accepts only real YYYY-MM-DD dates", () => {
    expect(isYmd("2026-10-16")).toBe(true);
    expect(isYmd("2026-02-30")).toBe(false);
    expect(isYmd("16.10.2026")).toBe(false);
    expect(isYmd(null)).toBe(false);
  });

  it("formats a document date as DD.MM.YYYY", () => {
    expect(ymdToDots("2026-10-16")).toBe("16.10.2026");
    expect(ymdToDots("bad")).toBe("");
    expect(ymdToDots(null)).toBe("");
  });
});

describe("permissions", () => {
  it("is open to every internal employee and closed to studios", () => {
    for (const p of ["direktor", "orinbosar", "hr", "koordinator", "bolim_boshligi", "mutaxassis"]) {
      expect(canUseInternalDocs(p)).toBe(true);
    }
    expect(canUseInternalDocs("kontragent")).toBe(false);
    expect(canUseInternalDocs(null)).toBe(false);
  });

  it("lets the uploader or management delete, nobody else", () => {
    const uploader = "11111111-1111-4111-8111-111111111111";
    expect(canDeleteInternalDoc({ id: uploader, position: "mutaxassis" }, uploader)).toBe(true);
    expect(canDeleteInternalDoc({ id: "other", position: "mutaxassis" }, uploader)).toBe(false);
    expect(canDeleteInternalDoc({ id: "other", position: "direktor" }, uploader)).toBe(true);
    expect(canDeleteInternalDoc({ id: "other", position: "hr" }, null)).toBe(true);
    expect(canDeleteInternalDoc({ id: "other", position: "mutaxassis" }, null)).toBe(false);
    expect(canDeleteInternalDoc({ id: uploader, position: "kontragent" }, uploader)).toBe(false);
  });
});

describe("matchesQuery", () => {
  const doc = { title: "Taʼtil haqida bildirgi", docNumber: "B-12", fileName: "tatil.docx", uploaderName: "Karimov Rustam" };
  it("searches title, number, file name and uploader case-insensitively", () => {
    expect(matchesQuery(doc, "")).toBe(true);
    expect(matchesQuery(doc, "BILDIRGI")).toBe(true);
    expect(matchesQuery(doc, "b-12")).toBe(true);
    expect(matchesQuery(doc, "tatil.docx")).toBe(true);
    expect(matchesQuery(doc, "karimov")).toBe(true);
    expect(matchesQuery(doc, "buyruq")).toBe(false);
  });
});
