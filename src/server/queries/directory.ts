import "server-only";
import { and, eq, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { coordinatorAssignments, departments, users, type Position } from "@/lib/db/schema";
import { employeeContactCards } from "@/lib/db/tables/staff-directory";
import { can } from "@/lib/permissions/capabilities";
import type { SessionUser } from "@/lib/session";
import {
  buildOrgTree,
  deptName,
  sortDirectory,
  tashkentToday,
  toAwayKind,
  type OrgTree,
  type PersonRow,
} from "@/components/staff/staff-directory/logic";

export type { DeptNode, OrgTree, PersonLite, PersonRow } from "@/components/staff/staff-directory/logic";

// Tashkiliy tuzilma / xodimlar maʼlumotnomasi uchun oʻqish soʻrovlari.
// employee_contact_cards (0031) jadvaliga tegadigan har bir oʻqish try/catch bilan
// himoyalangan: migratsiya qoʻllanmagan boʻlsa sahifa kontakt maydonlarisiz ishlaydi.

// queries/search.ts bilan bir xil normallashtirish: apostrof variantlari va registr eʼtiborsiz.
const APOS = "ʻʼʹ‘’`´'";

function normalizeTerm(q: string): string {
  return q.toLowerCase().replace(/[ʻʼʹ‘’`´']/g, "").trim();
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DirectoryFilters = { q?: string; departmentId?: string; skill?: string };

type RawDirectoryRow = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  position: Position;
  positionTitle: string | null;
  departmentId: string | null;
  deptName: string | null;
  deptLatn: string | null;
  deptCyrl: string | null;
  deptRu: string | null;
  email: string;
  phone: string | null;
  managerName: string | null;
  awayUntil: string | null;
  awayType: string | null;
  workPhone: string | null;
  internalExt: string | null;
  room: string | null;
  telegramUsername: string | null;
  bio: string | null;
  skills: string[] | null;
  showMobile: boolean | null;
};

async function queryDirectory(
  f: { term: string; departmentId: string | null; skill: string | null },
  today: string,
  withCard: boolean
): Promise<RawDirectoryRow[]> {
  const cardCols = withCard
    ? sql`c.work_phone as "workPhone", c.internal_ext as "internalExt", c.room as "room",
          c.telegram_username as "telegramUsername", c.bio as "bio", c.skills as "skills",
          c.show_mobile as "showMobile"`
    : sql`null::text as "workPhone", null::text as "internalExt", null::text as "room",
          null::text as "telegramUsername", null::text as "bio", null::text[] as "skills",
          false as "showMobile"`;
  const cardJoin = withCard ? sql`left join employee_contact_cards c on c.user_id = u.id` : sql``;

  const conds: SQL[] = [sql`u.status = 'active'`, sql`u.hidden = false`, sql`u.position <> 'kontragent'`];
  if (f.departmentId) conds.push(sql`u.department_id = ${f.departmentId}::uuid`);
  if (f.skill) {
    // Koʻnikmalar faqat yangi jadvalda — u boʻlmasa, filtr hech kimga mos kelmaydi.
    if (!withCard) return [];
    conds.push(sql`c.skills @> array[${f.skill}::text]`);
  }
  if (f.term) {
    const like = `%${escapeLike(f.term)}%`;
    const cols: SQL[] = [sql`u.full_name`, sql`u.email`, sql`u.position_title`];
    if (withCard) cols.push(sql`c.work_phone`, sql`c.internal_ext`, sql`array_to_string(c.skills, ' ')`);
    conds.push(sql`(${sql.join(
      cols.map((c) => sql`translate(lower(${c}), ${APOS}, '') like ${like}`),
      sql` or `
    )})`);
  }

  const rows = await db.execute<RawDirectoryRow>(sql`
    select
      u.id as "id",
      u.full_name as "fullName",
      u.avatar_url as "avatarUrl",
      u.position as "position",
      u.position_title as "positionTitle",
      u.department_id as "departmentId",
      d.name as "deptName",
      d.name_uz_latn as "deptLatn",
      d.name_uz_cyrl as "deptCyrl",
      d.name_ru as "deptRu",
      u.email as "email",
      u.phone as "phone",
      m.full_name as "managerName",
      null::text as "awayUntil",
      null::text as "awayType",
      ${cardCols}
    from users u
    left join departments d on d.id = u.department_id
    left join users m on m.id = u.reports_to_user_id and m.hidden = false
    ${cardJoin}
    where ${sql.join(conds, sql` and `)}
  `);
  return Array.from(rows);
}

/**
 * Xodimlar maʼlumotnomasi: faqat faol, yashirin boʻlmagan, ichki xodimlar.
 * Mobil raqam faqat show_mobile = true boʻlsa; taʼtil turi faqat HR koʻruvchiga.
 */
export async function listDirectory(
  viewer: Pick<SessionUser, "id" | "position">,
  f: DirectoryFilters,
  locale: string
): Promise<PersonRow[]> {
  const term = normalizeTerm((f.q ?? "").slice(0, 100));
  const departmentId = f.departmentId && UUID_RE.test(f.departmentId) ? f.departmentId : null;
  const skill = f.skill ? f.skill.trim().toLowerCase().slice(0, 40) || null : null;
  const filters = { term, departmentId, skill };
  const today = tashkentToday();

  let rows: RawDirectoryRow[];
  try {
    rows = await queryDirectory(filters, today, true);
  } catch {
    // employee_contact_cards hali yaratilmagan — kontakt maydonlarisiz qayta soʻraymiz.
    rows = await queryDirectory(filters, today, false);
  }

  const revealType = can(viewer.position, "hr.documents");
  const out: PersonRow[] = rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    avatarUrl: r.avatarUrl,
    position: r.position,
    positionTitle: r.positionTitle,
    departmentId: r.departmentId,
    departmentName:
      r.departmentId && r.deptName
        ? deptName({ name: r.deptName, nameUzLatn: r.deptLatn, nameUzCyrl: r.deptCyrl, nameRu: r.deptRu }, locale)
        : null,
    email: r.email,
    mobile: r.showMobile ? r.phone || null : null,
    workPhone: r.workPhone,
    internalExt: r.internalExt,
    room: r.room,
    telegramUsername: r.telegramUsername,
    bio: r.bio,
    skills: r.skills ?? [],
    managerName: r.managerName,
    away: r.awayUntil ? { until: r.awayUntil, kind: toAwayKind(r.awayType, revealType) } : null,
  }));
  return sortDirectory(out);
}

/** Tashkiliy daraxt: 4 ta soʻrov, daraxt xotirada quriladi (sikl va chuqurlik himoyasi bilan). */
export async function getOrgTree(locale: string): Promise<OrgTree> {
  const activeStaff = and(eq(users.status, "active"), eq(users.hidden, false), ne(users.position, "kontragent"));

  const [depts, people, coords] = await Promise.all([
    db
      .select({
        id: departments.id,
        name: departments.name,
        nameUzLatn: departments.nameUzLatn,
        nameUzCyrl: departments.nameUzCyrl,
        nameRu: departments.nameRu,
        parentDepartmentId: departments.parentDepartmentId,
        headUserId: departments.headUserId,
      })
      .from(departments),
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        position: users.position,
        positionTitle: users.positionTitle,
        departmentId: users.departmentId,
      })
      .from(users)
      .where(activeStaff),
    db
      .select({ departmentId: coordinatorAssignments.departmentId, userId: coordinatorAssignments.coordinatorUserId })
      .from(coordinatorAssignments)
      .innerJoin(users, eq(users.id, coordinatorAssignments.coordinatorUserId))
      .where(activeStaff),
  ]);

  return buildOrgTree({
    departments: depts.map((d) => ({
      id: d.id,
      name: deptName(d, locale),
      parentDepartmentId: d.parentDepartmentId,
      headUserId: d.headUserId,
    })),
    people: people.map((p) => ({ ...p, awayToday: false })),
    coordinators: coords,
  });
}

export type ContactCardView = {
  workPhone: string | null;
  internalExt: string | null;
  room: string | null;
  telegramUsername: string | null;
  bio: string | null;
  skills: string[];
  showMobile: boolean;
  phone: string | null;
};

/** Xodimning kontakt kartasi (+ users.phone). Karta yoʻq yoki jadval yaratilmagan boʻlsa — null. */
export async function getContactCard(userId: string): Promise<ContactCardView | null> {
  if (!UUID_RE.test(userId)) return null;
  try {
    const [r] = await db
      .select({
        workPhone: employeeContactCards.workPhone,
        internalExt: employeeContactCards.internalExt,
        room: employeeContactCards.room,
        telegramUsername: employeeContactCards.telegramUsername,
        bio: employeeContactCards.bio,
        skills: employeeContactCards.skills,
        showMobile: employeeContactCards.showMobile,
        phone: users.phone,
      })
      .from(employeeContactCards)
      .innerJoin(users, eq(users.id, employeeContactCards.userId))
      .where(eq(employeeContactCards.userId, userId))
      .limit(1);
    return r ? { ...r, skills: r.skills ?? [] } : null;
  } catch {
    return null;
  }
}

/** Faol xodimlarning barcha koʻnikmalari (filtr chiplari uchun). */
export async function listSkills(): Promise<string[]> {
  try {
    const rows = await db.execute<{ skill: string }>(sql`
      select distinct s.skill as "skill"
      from employee_contact_cards c
      join users u on u.id = c.user_id
      cross join lateral unnest(c.skills) as s(skill)
      where u.status = 'active' and u.hidden = false and u.position <> 'kontragent' and s.skill <> ''
      order by 1
      limit 200
    `);
    return Array.from(rows)
      .map((r) => r.skill)
      .filter(Boolean);
  } catch {
    return [];
  }
}
