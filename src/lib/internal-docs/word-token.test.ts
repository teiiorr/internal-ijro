import { describe, expect, it } from "vitest";
import { WORD_TOKEN_TTL_SECONDS, createWordToken, verifyWordToken } from "./word-token";

const SECRET = "test-secret-value";
const DOC = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const NOW = 1_800_000_000;

describe("word token", () => {
  it("verifies a fresh token for the same document", () => {
    const t = createWordToken(DOC, SECRET, NOW);
    expect(verifyWordToken(DOC, t, SECRET, NOW)).toBe(true);
    expect(verifyWordToken(DOC, t, SECRET, NOW + WORD_TOKEN_TTL_SECONDS)).toBe(true);
  });

  it("rejects it for another document, after expiry, or with another secret", () => {
    const t = createWordToken(DOC, SECRET, NOW);
    expect(verifyWordToken(OTHER, t, SECRET, NOW)).toBe(false);
    expect(verifyWordToken(DOC, t, SECRET, NOW + WORD_TOKEN_TTL_SECONDS + 1)).toBe(false);
    expect(verifyWordToken(DOC, t, "another-secret", NOW)).toBe(false);
  });

  it("rejects a tampered signature or a stretched expiry", () => {
    const t = createWordToken(DOC, SECRET, NOW);
    const [exp, sig] = t.split(".");
    const flipped = `${exp}.${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`;
    expect(verifyWordToken(DOC, flipped, SECRET, NOW)).toBe(false);
    const stretched = `${Number(exp) + 86_400}.${sig}`;
    expect(verifyWordToken(DOC, stretched, SECRET, NOW)).toBe(false);
  });

  it("rejects malformed input and an empty secret", () => {
    expect(verifyWordToken(DOC, "", SECRET, NOW)).toBe(false);
    expect(verifyWordToken(DOC, null, SECRET, NOW)).toBe(false);
    expect(verifyWordToken(DOC, "abc.def", SECRET, NOW)).toBe(false);
    expect(verifyWordToken(DOC, createWordToken(DOC, SECRET, NOW), "", NOW)).toBe(false);
    expect(() => createWordToken(DOC, "", NOW)).toThrow("missing_secret");
  });
});
