import { describe, expect, it } from "vitest";
import { extractRows, normalizeName, parseCsv } from "./sheet-parse";

// Pure Google-Sheets CSV report parser (its own header calls it a "SOF modul").
// Covers the RFC-4180 quoting rules, the cross-alphabet name skeleton and the
// flexible header detection.

describe("parseCsv", () => {
  it("returns no rows for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("splits plain comma-separated rows", () => {
    expect(parseCsv("a,b,c")).toEqual([["a", "b", "c"]]);
    expect(parseCsv("a,b\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("keeps commas and newlines inside quoted fields", () => {
    expect(parseCsv('"a,b",c')).toEqual([["a,b", "c"]]);
    expect(parseCsv('"a\nb",c')).toEqual([["a\nb", "c"]]);
  });

  it('unescapes doubled quotes ("" -> ")', () => {
    expect(parseCsv('"a""b"')).toEqual([['a"b']]);
  });

  it("normalises CRLF / CR line endings and drops a trailing newline", () => {
    expect(parseCsv("a\r\nb")).toEqual([["a"], ["b"]]);
    expect(parseCsv("a\rb")).toEqual([["a"], ["b"]]);
    expect(parseCsv("a\n")).toEqual([["a"]]);
  });
});

describe("normalizeName", () => {
  it("returns an empty skeleton for empty input", () => {
    expect(normalizeName("")).toBe("");
  });

  it("extracts the quoted title and strips the descriptor", () => {
    expect(normalizeName("«Дайи» Бадиий фильм")).toBe("dai");
  });

  it("maps Cyrillic and Latin spellings of the same name to one skeleton", () => {
    expect(normalizeName("Orzu-havas")).toBe(normalizeName("Орзу-ҳавас"));
    expect(normalizeName("Orzu-havas")).toBe("orzuhavas");
  });

  it("keeps ў/oʻ distinct from о/o (the documented «Тўр» vs «Тор» guard)", () => {
    expect(normalizeName("Тўр")).toBe("twr");
    expect(normalizeName("Тор")).toBe("tor");
    expect(normalizeName("Тўр")).not.toBe(normalizeName("Тор"));
  });
});

describe("extractRows", () => {
  it("returns nothing when there is no header or no rows", () => {
    expect(extractRows([])).toEqual([]);
    expect(extractRows([["foo", "bar", "baz"]])).toEqual([]);
  });

  it("finds the name/status columns from a bilingual header and extracts data rows", () => {
    const grid = [
      ["#", "Лойиҳа номи", "Лойиҳа ҳолати"],
      ["1", "Dala hovli", "Yakunlandi"],
      ["2", "Qora kecha", "Jarayonda"],
    ];
    expect(extractRows(grid)).toEqual([
      { name: "Dala hovli", status: "Yakunlandi" },
      { name: "Qora kecha", status: "Jarayonda" },
    ]);
  });

  it("skips subtotal/numeric rows and rows with an empty cell", () => {
    const grid = [
      ["#", "Loyiha nomi", "Loyiha holati"],
      ["1", "Dala hovli", "Yakunlandi"],
      ["", "25", "100%"], // numeric 'name' -> subtotal, skipped
      ["3", "Yangi loyiha", ""], // empty status, skipped
    ];
    expect(extractRows(grid)).toEqual([{ name: "Dala hovli", status: "Yakunlandi" }]);
  });
});
