import "server-only";
import { and, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, tasks, users, externalCompanies, contests } from "@/lib/db/schema";

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
  const like = `%${term}%`;

  const [prj, tsk, emp, std, cnt] = await Promise.all([
    db
      .select({ id: projects.id, label: projects.name, sub: projects.status })
      .from(projects)
      .where(sql`${norm(projects.name)} like ${like}`)
      .orderBy(desc(projects.updatedAt))
      .limit(PER_GROUP),
    db
      .select({ id: tasks.id, label: tasks.title, sub: tasks.registrationNumber })
      .from(tasks)
      .where(sql`(${norm(tasks.title)} like ${like} or ${norm(tasks.registrationNumber)} like ${like})`)
      .orderBy(desc(tasks.updatedAt))
      .limit(PER_GROUP),
    db
      .select({ id: users.id, label: users.fullName, sub: users.email, position: users.position })
      .from(users)
      .where(
        and(
          sql`${users.position} <> 'kontragent'`,
          sql`${users.hidden} = false`,
          sql`(${norm(users.fullName)} like ${like} or ${norm(users.email)} like ${like})`
        )
      )
      .orderBy(users.fullName)
      .limit(PER_GROUP),
    db
      .select({ id: externalCompanies.id, label: externalCompanies.name, sub: externalCompanies.status })
      .from(externalCompanies)
      .where(sql`${norm(externalCompanies.name)} like ${like}`)
      .orderBy(externalCompanies.name)
      .limit(PER_GROUP),
    db
      .select({ id: contests.id, label: contests.name })
      .from(contests)
      .where(sql`${norm(contests.name)} like ${like}`)
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
