import "server-only";
import { and, eq, inArray, ne, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { coordinatorAssignments, users, type Position } from "@/lib/db/schema";
import { isOwner } from "@/lib/permissions/owner";
import type { SessionUser } from "@/lib/session";

/**
 * Auditoriya (kimga) — eʼlonlar va meʼyoriy hujjat tanishtiruvlari uchun UMUMIY KONTRAKT.
 * Bu modulni "announcements" xususiyati boshqaradi; "normative-ack" aynan shu
 * eksportlarni import qiladi — imzolarni oʻzgartirmang.
 *
 * jsonb sifatida saqlanadi: {all:true} | {departmentIds:[…]} | {positions:[…]} | {userIds:[…]}.
 */
export type Audience =
  | { all: true }
  | { departmentIds: string[] }
  | { positions: Position[] }
  | { userIds: string[] };

/** Auditoriya sifatida tanlanishi mumkin boʻlgan lavozimlar (kontragent — tashqi, hech qachon). */
export const AUDIENCE_POSITIONS = [
  "direktor",
  "orinbosar",
  "koordinator",
  "bolim_boshligi",
  "bosh_mutaxassis",
  "yetakchi_mutaxassis",
  "mutaxassis",
  "hr",
] as const satisfies readonly Position[];

/** Istalgan auditoriyaga yubora oladigan lavozimlar (rahbariyat + HR). Egasi ham shunday. */
export const ANY_AUDIENCE_POSITIONS: readonly Position[] = ["direktor", "orinbosar", "hr"];

const MAX_IDS = 200;

const dedupe = <T extends string>(xs: T[]): T[] => Array.from(new Set(xs));

const idList = z
  .array(z.guid())
  .min(1)
  .max(MAX_IDS)
  .transform((ids) => dedupe(ids.map((s) => s.toLowerCase())));

/** 4 shakldan birini qatʼiy tekshiradi (ortiqcha kalitlar — masalan {all:true, departmentIds} — rad etiladi). */
export const audienceSchema = z.union([
  z.strictObject({ all: z.literal(true) }),
  z.strictObject({ departmentIds: idList }),
  z.strictObject({ positions: z.array(z.enum(AUDIENCE_POSITIONS)).min(1).max(MAX_IDS).transform(dedupe) }),
  z.strictObject({ userIds: idList }),
]);

type Actor = Pick<SessionUser, "id" | "position" | "departmentId"> & { email?: string | null };

/**
 * Foydalanuvchi qaysi boʻlimlarga yubora oladi:
 * - direktor, orinbosar, hr (va platforma egasi) → "any"
 * - bolim_boshligi → [oʻz boʻlimi] (boʻlimi yoʻq boʻlsa [])
 * - koordinator → coordinator_assignments ∪ [oʻz boʻlimi]
 * - qolganlar → []
 */
export async function allowedDepartmentIds(me: Actor): Promise<string[] | "any"> {
  if (me.position === "kontragent") return [];
  if (ANY_AUDIENCE_POSITIONS.includes(me.position) || isOwner(me.email)) return "any";
  if (me.position === "bolim_boshligi") return me.departmentId ? [me.departmentId] : [];
  if (me.position === "koordinator") {
    const ids = new Set<string>();
    if (me.departmentId) ids.add(me.departmentId);
    const rows = await db
      .select({ departmentId: coordinatorAssignments.departmentId })
      .from(coordinatorAssignments)
      .where(eq(coordinatorAssignments.coordinatorUserId, me.id));
    for (const r of rows) ids.add(r.departmentId);
    return [...ids];
  }
  return [];
}

/**
 * Sof qaror (DB'siz): `allowed` toʻplami bilan auditoriyani solishtiradi.
 * - "any" → true
 * - departmentIds → boʻsh boʻlmagan va toʻliq ruxsat etilgan toʻplam ichida
 * - userIds → har bir foydalanuvchining boʻlimi ruxsat etilgan toʻplamda
 *   (`userDepartmentIds` — topilgan foydalanuvchilarning boʻlimlari, userIds bilan bir xil uzunlikda)
 * - all / positions → false
 */
export function audienceWithinAllowed(
  allowed: string[] | "any",
  a: Audience,
  userDepartmentIds: (string | null)[] = []
): boolean {
  if (allowed === "any") return true;
  const set = new Set(allowed);
  if (set.size === 0) return false;
  if ("departmentIds" in a) {
    return a.departmentIds.length > 0 && a.departmentIds.every((id) => set.has(id));
  }
  if ("userIds" in a) {
    return (
      a.userIds.length > 0 &&
      userDepartmentIds.length === a.userIds.length &&
      userDepartmentIds.every((d) => d !== null && set.has(d))
    );
  }
  return false;
}

/** Server tomonidagi RBAC: `me` ushbu auditoriyaga yubora oladimi. Notoʻgʻri shakl → false. */
export async function canSendToAudience(me: Actor, a: Audience): Promise<boolean> {
  const parsed = audienceSchema.safeParse(a);
  if (!parsed.success) return false;
  const aud: Audience = parsed.data;
  const allowed = await allowedDepartmentIds(me);
  if (allowed === "any") return true;
  if ("userIds" in aud) {
    const rows = await db
      .select({ id: users.id, departmentId: users.departmentId })
      .from(users)
      .where(inArray(users.id, aud.userIds));
    if (rows.length !== aud.userIds.length) return false;
    return audienceWithinAllowed(allowed, aud, rows.map((r) => r.departmentId));
  }
  return audienceWithinAllowed(allowed, aud);
}

/** Auditoriyaga mos keladigan faol, yashirin boʻlmagan, ichki (kontragent emas) foydalanuvchilar id'lari. */
export async function resolveAudience(a: Audience): Promise<string[]> {
  const base = and(eq(users.status, "active"), eq(users.hidden, false), ne(users.position, "kontragent"));
  let match: SQL | undefined;
  if ("all" in a) match = undefined;
  else if ("departmentIds" in a) match = a.departmentIds.length ? inArray(users.departmentId, a.departmentIds) : sql`false`;
  else if ("positions" in a) match = a.positions.length ? inArray(users.position, a.positions) : sql`false`;
  else match = a.userIds.length ? inArray(users.id, a.userIds) : sql`false`;
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(match ? and(base, match) : base);
  return rows.map((r) => r.id);
}

/**
 * SQL predikati: `column` (jsonb auditoriya) `me` ga koʻrinadimi.
 *   (col->>'all' = 'true' OR jsonb_exists(col->'positions', $pos) OR jsonb_exists(col->'userIds', $id)
 *    OR ($dept IS NOT NULL AND jsonb_exists(col->'departmentIds', $dept)))
 * `?` operatori oʻrniga jsonb_exists — parametr belgilari bilan chalkashmaslik uchun.
 * NULL hech qachon qaytmaydi (coalesce … false), shuning uchun NOT(...) ichida ham xavfsiz.
 */
export function audienceVisibleSql(
  column: AnyColumn | SQL,
  me: { id: string; position: string; departmentId: string | null }
): SQL {
  const parts: SQL[] = [
    sql`(${column}->>'all') = 'true'`,
    sql`jsonb_exists(${column}->'positions', ${me.position}::text)`,
    sql`jsonb_exists(${column}->'userIds', ${me.id}::text)`,
  ];
  if (me.departmentId) {
    parts.push(sql`jsonb_exists(${column}->'departmentIds', ${me.departmentId}::text)`);
  }
  return sql`coalesce((${sql.join(parts, sql` OR `)}), false)`;
}

/**
 * Auditoriyaning odam oʻqiydigan tavsifi. `t` quyidagi kalitlar bilan chaqiriladi:
 * "audienceAll", "audienceDepartments", "audiencePositions", "audiencePeople" va
 * `positions.<lavozim>` (masalan "positions.hr"). `depts` — boʻlim id → nomi.
 */
export function describeAudience(a: Audience, depts: Map<string, string>, t: (k: string) => string): string {
  if ("all" in a) return t("audienceAll");
  if ("departmentIds" in a) {
    return `${t("audienceDepartments")}: ${a.departmentIds.map((id) => depts.get(id) ?? "—").join(", ")}`;
  }
  if ("positions" in a) {
    return `${t("audiencePositions")}: ${a.positions.map((p) => t(`positions.${p}`)).join(", ")}`;
  }
  return `${t("audiencePeople")}: ${a.userIds.length}`;
}
