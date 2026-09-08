// Xotirada işlaydigan kiçik rate limiter. Bitta instansiyali dev/lokal foydalaniş uçun maqbul.
// Production'da uni @upstash/ratelimit + Redis bilan almaştiriş kerak (TZ §10.2 da tavsiya etilgan).
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (b.count >= limit) return { allowed: false, remaining: 0 };
  b.count += 1;
  return { allowed: true, remaining: limit - b.count };
}
