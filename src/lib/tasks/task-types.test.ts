import { describe, expect, it } from "vitest";
import { TASK_TYPE_SEEDS, mergeTaskTypeSuggestions } from "./task-types";

describe("task type suggestions", () => {
  it("puts used types first and drops case-insensitive duplicates", () => {
    const out = mergeTaskTypeSuggestions(["Hukumat qarori", "xat", " "]);
    expect(out[0]).toBe("Hukumat qarori");
    expect(out[1]).toBe("xat");
    expect(out.filter((v) => v.toLowerCase() === "xat")).toHaveLength(1);
    expect(out).toContain("Buyruq");
  });
  it("falls back to the seed list", () => {
    expect(mergeTaskTypeSuggestions([])).toEqual(TASK_TYPE_SEEDS);
  });
});
