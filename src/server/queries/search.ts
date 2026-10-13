import "server-only";
import { and, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, tasks, users, externalCompanies, contests } from "@/lib/db/schema";
import { queryVariants } from "@/lib/search-layout";

export type SearchHit = {
  id: string;
  label: string;
  sub: string | null;
  href: string;
};

export type SearchResults = {
  projects: SearchHit[];
  tasks: SearchHit[];
  employees: SearchHit[];
  studios: SearchHit[];
  contests: SearchHit[];
};

// Oʻzbekcha qidiruv: apostrof variantlari (ʻ ʼ ʹ ' ' ` ´ ') va registrni e'tiborsiz
// qoldiramiz — "Xoʻjayev" == "Xo'jayev" == "Xojayev". Ustun va so'rov ikkala
// tomondan bir xil normallashtiriladi.
const APOS = "ʻʼʹ‘’`´'";
const norm = (col: ReturnType<typeof sql> | unknown) =>
  sql`translate(lower(${col}), ${APOS}, '')`;

function normalizeTerm(q: string): string {
  return q.toLowerCase().replace(/[ʻʼʹ‘’`´']/g, "").trim();
}

const PER_GROUP = 6;

export async function globalSearch(q: string): Promise<SearchResults> {
  const term = normalizeTerm(q);
  const empty: SearchResults = { projects: [], tasks: [], employees: [], studios: [], contests: [] };
  if (term.length < 2) return empty;
  // Klaviatura joylashuvini sezmaydi: asl + almashtirilgan (RU<->US) variantlar uchun LIKE naqshlari.
  const likes = queryVariants(term)
    .map((v) => normalizeTerm(v))
    .filter((v) => v.length >= 2)
    .map((v) => `%${v}%`);
  /** Ustun berilgan har qanday variantga mos kelsa (OR). */
  const anyLike = (col: unknown) => sql.join(likes.map((l) => sql`${norm(col)} like ${l}`), sql` or `);

  const [prj, tsk, emp, std, cnt] = await Promise.all([
    db
      .select({ id: projects.id, label: projects.name, sub: projects.status })
      .from(projects)
      .where(sql`(${anyLike(projects.name)})`)
      .orderBy(desc(projects.updatedAt))
      .limit(PER_GROUP),
    db
      .select({ id: tasks.id, label: tasks.title, sub: tasks.registrationNumber })
      .from(tasks)
      .where(sql`(${anyLike(tasks.title)} or ${anyLike(tasks.registrationNumber)})`)
      .orderBy(desc(tasks.updatedAt))
      .limit(PER_GROUP),
    db
      .select({ id: users.id, label: users.fullName, sub: users.email, position: users.position })
      .from(users)
      .where(
        and(
          sql`${users.position} <> 'kontragent'`,
          sql`${users.hidden} = false`,
          sql`(${anyLike(users.fullName)} or ${anyLike(users.email)})`
        )
      )
      .orderBy(users.fullName)
      .limit(PER_GROUP),
    db
      .select({ id: externalCompanies.id, label: externalCompanies.name, sub: externalCompanies.status })
      .from(externalCompanies)
      .where(sql`(${anyLike(externalCompanies.name)})`)
      .orderBy(externalCompanies.name)
      .limit(PER_GROUP),
    db
      .select({ id: contests.id, label: contests.name })
      .from(contests)
      .where(sql`(${anyLike(contests.name)})`)
      .orderBy(desc(contests.createdAt))
      .limit(PER_GROUP),
  ]);

  return {
    projects: prj.map((r) => ({ id: r.id, label: r.label, sub: r.sub, href: `/projects/${r.id}` })),
    tasks: tsk.map((r) => ({ id: r.id, label: r.label, sub: r.sub, href: `/tasks/${r.id}` })),
    employees: emp.map((r) => ({ id: r.id, label: r.label, sub: r.sub, href: `/employees/${r.id}` })),
    studios: std.map((r) => ({ id: r.id, label: r.label, sub: r.sub, href: `/contractors/${r.id}` })),
    contests: cnt.map((r) => ({ id: r.id, label: r.label, sub: null, href: `/tanlov/${r.id}` })),
  };
}
