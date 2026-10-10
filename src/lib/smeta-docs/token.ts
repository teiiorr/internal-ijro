import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Word ish stoli ilovasi faylni OʻZ jarayonida yuklaydi — brauzer session cookie'si
// bormaydi. Shuning uchun "Word'da ochish" uchun qisqa muddatli imzolangan token
// beriladi: faqat shu faylga, ~5 daqiqaga. Tokenni faqat tizimga kirgan ichki xodim
// (server action orqali) oladi; roʻut uni session oʻrnida qabul qiladi.
const TTL_MS = 5 * 60 * 1000;

function secret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(id: string, exp: number): string {
  return createHmac("sha256", secret()).update(`${id}|${exp}`).digest("base64url");
}

/** `<expiry>.<hmac>` — faqat shu `id` uchun amal qiladi. */
export function signDocToken(id: string): string {
  const exp = Date.now() + TTL_MS;
  return `${exp}.${sign(id, exp)}`;
}

export function verifyDocToken(id: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const exp = Number(token.slice(0, dot));
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = sign(id, exp);
  const got = token.slice(dot + 1);
  if (got.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}
