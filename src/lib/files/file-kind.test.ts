import { describe, expect, it } from "vitest";
import { fileExt, fileKind, fileTypeLabel, hasThumbnail, humanSize, inlinePreviewMime } from "./file-kind";

describe("file kind", () => {
  it("detects the kind from the extension, case-insensitively", () => {
    expect(fileKind("Buyruq №15.DOCX")).toBe("word");
    expect(fileKind("smeta.xlsx")).toBe("excel");
    expect(fileKind("taqdimot.pptx")).toBe("slides");
    expect(fileKind("hisobot.pdf")).toBe("pdf");
    expect(fileKind("rasm.JPG")).toBe("image");
    expect(fileKind("arxiv.7z")).toBe("archive");
    expect(fileKind("README")).toBe("other");
    expect(fileKind(null)).toBe("other");
  });

  it("returns the bare extension and its label", () => {
    expect(fileExt(" a.b.Pdf ")).toBe("pdf");
    expect(fileExt("noext")).toBe("");
    expect(fileTypeLabel("x.docx")).toBe("DOCX");
  });

  it("previews only PDFs and raster images inline", () => {
    expect(inlinePreviewMime("a.pdf")).toBe("application/pdf");
    expect(inlinePreviewMime("a.jpeg")).toBe("image/jpeg");
    expect(inlinePreviewMime("a.svg")).toBeNull();
    expect(inlinePreviewMime("a.html")).toBeNull();
    expect(inlinePreviewMime("a.docx")).toBeNull();
  });

  it("draws thumbnails only for formats the file route can shrink", () => {
    expect(hasThumbnail("a.png")).toBe(true);
    expect(hasThumbnail("a.gif")).toBe(false);
    expect(hasThumbnail("a.pdf")).toBe(false);
  });

  it("formats sizes for people", () => {
    expect(humanSize(null)).toBe("");
    expect(humanSize(0)).toBe("");
    expect(humanSize(512)).toBe("512 B");
    expect(humanSize(1536)).toBe("2 KB");
    expect(humanSize(3.4 * 1024 * 1024)).toBe("3.4 MB");
    expect(humanSize(42 * 1024 * 1024)).toBe("42 MB");
  });
});
