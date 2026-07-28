/**
 * Returns a short relative description of a deadline in Uzbek (Latin):
 *   "Bugun"            — today
 *   "Ertaga"           — tomorrow
 *   "3 kun qoldi"      — 2..14 days ahead
 *   "27-may"           — > 14 days
 *   "Kechikdi 2 kun"   — past, not completed
 */
// Timestamps are stored in UTC and the server runs in UTC, but the whole
// organisation works in Toshkent (UTC+5, no DST). Shift by +5h and then read the
// UTC fields so the displayed wall-clock is always Toshkent time.
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const toTashkent = (d: Date) => new Date(d.getTime() + TASHKENT_OFFSET_MS);

export function deadlineRelative(deadline: Date | string | null | undefined, opts?: { completed?: boolean }): { text: string; tone: "default" | "soon" | "today" | "overdue" } {
  if (!deadline) return { text: "—", tone: "default" };
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return { text: "—", tone: "default" };

  const nowTz = toTashkent(new Date());
  const dTz = toTashkent(d);
  const startOfToday = Date.UTC(nowTz.getUTCFullYear(), nowTz.getUTCMonth(), nowTz.getUTCDate());
  const startOfDeadline = Date.UTC(dTz.getUTCFullYear(), dTz.getUTCMonth(), dTz.getUTCDate());
  const diffDays = Math.round((startOfDeadline - startOfToday) / 86_400_000);

  if (opts?.completed) {
    return { text: formatDate(d), tone: "default" };
  }

  if (diffDays < 0) return { text: `Kechikdi ${-diffDays} kun`, tone: "overdue" };
  if (diffDays === 0) return { text: "Bugun", tone: "today" };
  if (diffDays === 1) return { text: "Ertaga", tone: "soon" };
  if (diffDays <= 3) return { text: `${diffDays} kun qoldi`, tone: "soon" };
  if (diffDays <= 14) return { text: `${diffDays} kun qoldi`, tone: "default" };
  return { text: formatDate(d), tone: "default" };
}

const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
export function formatDate(d: Date | string) {
  const x = toTashkent(new Date(d));
  return `${x.getUTCDate()}-${UZ_MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

export function formatDateTime(d: Date | string) {
  const x = toTashkent(new Date(d));
  const hh = String(x.getUTCHours()).padStart(2, "0");
  const mm = String(x.getUTCMinutes()).padStart(2, "0");
  return `${formatDate(d)}, ${hh}:${mm}`;
}
