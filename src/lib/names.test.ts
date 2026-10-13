import { describe, expect, it } from "vitest";
import { localizeName, shortName } from "./names";

// Names are stored in Uzbek Latin. shortName drops the patronymic (3rd word);
// localizeName transliterates to Cyrillic (uz-cyrl) or Russian style (ru) and
// leaves every other locale untouched.

describe("shortName", () => {
  it("drops the patronymic, keeping the first two words", () => {
    expect(shortName("Ahmedov Jasur Akromovich")).toBe("Ahmedov Jasur");
  });

  it("keeps one- and two-word names as-is", () => {
    expect(shortName("Ahmedov")).toBe("Ahmedov");
    expect(shortName("Ahmedov Jasur")).toBe("Ahmedov Jasur");
  });

  it("trims and collapses surrounding/inner whitespace", () => {
    expect(shortName("  Ahmedov   Jasur  Akromovich ")).toBe("Ahmedov Jasur");
  });

  it("returns an empty string for null/undefined/empty", () => {
    expect(shortName(null)).toBe("");
    expect(shortName(undefined)).toBe("");
    expect(shortName("")).toBe("");
  });
});

describe("localizeName", () => {
  it("passes through for Latin locales", () => {
    expect(localizeName("Ahmedov Jasur Akromovich", "uz-latn")).toBe("Ahmedov Jasur");
    expect(localizeName("Ahmedov Jasur", "en")).toBe("Ahmedov Jasur");
  });

  it("transliterates to Uzbek Cyrillic and preserves capitalisation", () => {
    expect(localizeName("Ahmedov Jasur", "uz-cyrl")).toBe("Аҳмедов Жасур");
    expect(localizeName("Sharof", "uz-cyrl")).toBe("Шароф"); // sh digraph
    expect(localizeName("O'tkir", "uz-cyrl")).toBe("Ўткир"); // o' digraph
  });

  it("uses the Russian letter set where it diverges (h, q, o')", () => {
    // Russian has no ҳ/ғ/қ/ў: 'h' becomes 'х', not 'ҳ'.
    expect(localizeName("Ahmedov Jasur", "ru")).toBe("Ахмедов Жасур");
  });

  it("returns an empty string for null/undefined", () => {
    expect(localizeName(null, "ru")).toBe("");
    expect(localizeName(undefined, "uz-cyrl")).toBe("");
  });
});
