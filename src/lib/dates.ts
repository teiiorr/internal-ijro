/**
 * Returns a short relative description of a deadline in Uzbek (Latin):
 *   "Bugun"            — today
 *   "Ertaga"           — tomorrow
 *   "3 kun qoldi"      — 2..14 days ahead
 *   "27-may"           — > 14 days
 *   "Kechikti 2 kun"   — past, not completed
 */
export function deadlineRelative(deadline: Date | string | null | undefined, opts?: { completed?: boolean }): { text: string; tone: "default" | "soon" | "today" | "overdue" } {
  if (!deadline) return { text: "—", tone: "default" };
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return { text: "—", tone: "default" };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDeadline = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfDeadline.getTime() - startOfToday.getTime()) / 86_400_000);

  if (opts?.completed) {
    return { text: formatDate(d), tone: "default" };
  }

  if (diffDays < 0) return { text: `Kechikti ${-diffDays} kun`, tone: "overdue" };
  if (diffDays === 0) return { text: "Bugun", tone: "today" };
  if (diffDays === 1) return { text: "Ertaga", tone: "soon" };
  if (diffDays <= 3) return { text: `${diffDays} kun qoldi`, tone: "soon" };
  if (diffDays <= 14) return { text: `${diffDays} kun qoldi`, tone: "default" };
  return { text: formatDate(d), tone: "default" };
}

const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
export function formatDate(d: Date | string) {
  const x = new Date(d);
  return `${x.getDate()}-${UZ_MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}

export function formatDateTime(d: Date | string) {
  const x = new Date(d);
  const hh = String(x.getHours()).padStart(2, "0");
  const mm = String(x.getMinutes()).padStart(2, "0");
  return `${formatDate(x)}, ${hh}:${mm}`;
}
