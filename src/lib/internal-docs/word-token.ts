// Word hujjatni brauzer kukisiz yuklab oladi, shuning uchun "Wordda ochish" havolasi qisqa
// muddatli imzolangan token bilan beriladi: token aniq bitta hujjatga bogʻlangan va
// WORD_TOKEN_TTL_SECONDS dan keyin yaroqsiz. Imzo HMAC-SHA256 (kalit — AUTH_SECRET).

import { createHmac, timingSafeEqual } from "node:crypto";

export const WORD_TOKEN_TTL_SECONDS = 15 * 60;

function sign(docId: string, exp: number, secret: string): string {
  return createHmac("sha256", secret).update(`internal-doc-word:${docId}:${exp}`).digest("base64url");
}

/** `<exp>.<imzo>` koʻrinishidagi token (exp — Unix soniyalarda). */
export function createWordToken(docId: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  if (!secret) throw new Error("missing_secret");
  const exp = nowSeconds + WORD_TOKEN_TTL_SECONDS;
  return `${exp}.${sign(docId, exp, secret)}`;
}

/** Token shu hujjat uchun berilgan, muddati oʻtmagan va imzosi toʻgʻrimi. */
export function verifyWordToken(
  docId: string,
  token: string | null | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!secret || !token) return false;
  const m = /^(\d{9,11})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!m) return false;
  const exp = Number(m[1]);
  if (!Number.isFinite(exp) || exp < nowSeconds) return false;
  // Kelajakka haddan tashqari uzoq tokenlarni rad etamiz (soxtalashtirilgan exp).
  if (exp - nowSeconds > WORD_TOKEN_TTL_SECONDS + 60) return false;
  const expected = Buffer.from(sign(docId, exp, secret));
  const given = Buffer.from(m[2]);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
