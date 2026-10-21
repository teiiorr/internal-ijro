import "server-only";
import { headers } from "next/headers";

/**
 * Joriy sörovning taşqi manzili (nginx proksi orqasida ham): masalan Word faylni aynan
 * şu manzildan yuklab oladi. Lokal xostda http, qolganida https (yoki X-Forwarded-Proto).
 */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  if (host) {
    const fwd = h.get("x-forwarded-proto")?.split(",")[0].trim();
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
    return `${fwd || (local ? "http" : "https")}://${host}`;
  }
  return (process.env.APP_URL ?? "").replace(/\/+$/, "");
}
