import type { Position } from "@/lib/db/schema";
import { POSITION_LEVEL } from "@/lib/permissions/positions";

// Tashkiliy tuzilma va xodimlar maʼlumotnomasi uchun sof (DB'siz) mantiq.
// Server soʻrovlari, API route'lar, mijoz komponentlari va unit-testlar shu yerdan import qiladi —
// shuning uchun bu fayl "server-only" yoki DB modullarini tortmasligi kerak.

// ---------------- Turlar ----------------

/** HR boʻlmagan foydalanuvchilar uchun taʼtil turi hech qachon oshkor qilinmaydi — faqat "away". */
export type AwayKind = "away" | "vacation" | "sick" | "unpaid" | "other";

export const LEAVE_KINDS = ["vacation", "sick", "unpaid", "other"] as const;

export type PersonRow = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  position: Position;
  positionTitle: string | null;
  departmentId: string | null;
  departmentName: string | null;
  email: string;
  /** Faqat show_mobile = true boʻlganda toʻldiriladi. */
  mobile: string | null;
  workPhone: string | null;
  internalExt: string | null;
  room: string | null;
  telegramUsername: string | null;
  bio: string | null;
  skills: string[];
  managerName: string | null;
  away: { until: string; kind: AwayKind } | null;
};

export type PersonLite = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  position: Position;
  positionTitle: string | null;
  /** Bugun tasdiqlangan taʼtilda (turi koʻrsatilmaydi). */
  awayToday: boolean;
};

export type DeptNode = {
  id: string;
  name: string;
  head: PersonLite | null;
  coordinators: PersonLite[];
  /** Boʻlim aʼzolari (boshliqdan tashqari), POSITION_LEVEL boʻyicha tartiblangan. */
  members: PersonLite[];
  /** Boshliq + aʼzolar soni (faqat shu boʻlim, quyi boʻlimlarsiz). */
  memberCount: number;
  awayToday: number;
  children: DeptNode[];
};

export type OrgTree = {
  leadership: PersonLite[];
  departments: DeptNode[];
  unassigned: PersonLite[];
};

export type DeptInput = {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  headUserId: string | null;
};

export type PersonInput = PersonLite & { departmentId: string | null };

export const MAX_TREE_DEPTH = 10;
export const LEADERSHIP_POSITIONS: readonly Position[] = ["direktor", "orinbosar"];

// ---------------- Sana / matn yordamchilari ----------------

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Toshkent (UTC+5) boʻyicha bugungi kalendar kuni, YYYY-MM-DD. */
export function tashkentToday(now: Date = new Date()): string {
  return new Date(now.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/** "2026-10-12" → "12.10". Notoʻgʻri qiymat boʻlsa — boʻsh satr. */
export function fmtDdMm(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}.${m[2]}` : "";
}

/** HR boʻlmagan koʻruvchi uchun har doim "away"; HR uchun maʼlum turlar, nomaʼlumi — "other". */
export function toAwayKind(type: string | null | undefined, revealType: boolean): AwayKind {
  if (!revealType) return "away";
  return (LEAVE_KINDS as readonly string[]).includes(type ?? "") ? (type as AwayKind) : "other";
}

type DeptNames = {
  name: string;
  nameUzLatn?: string | null;
  nameUzCyrl?: string | null;
  nameRu?: string | null;
};

/** Lokallashtirilgan boʻlim nomi: uz-cyrl / ru — oʻz ustuni, aks holda name_uz_latn ?? name. */
export function deptName(d: DeptNames, locale: string): string {
  const loc = locale === "uz-cyrl" ? d.nameUzCyrl : locale === "ru" ? d.nameRu : null;
  return loc?.trim() || d.nameUzLatn?.trim() || d.name;
}

export function levelOf(p: Position): number {
  return POSITION_LEVEL[p] ?? 999;
}

/** Lavozim darajasi, soʻng ism boʻyicha. */
export function comparePeople(a: { position: Position; fullName: string }, b: { position: Position; fullName: string }): number {
  return levelOf(a.position) - levelOf(b.position) || a.fullName.localeCompare(b.fullName);
}

/** Maʼlumotnoma tartibi: boʻlim nomi (boʻlimsizlar oxirida), lavozim darajasi, ism. */
export function sortDirectory<T extends { departmentName: string | null; position: Position; fullName: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.departmentName !== b.departmentName) {
      if (a.departmentName === null) return 1;
      if (b.departmentName === null) return -1;
      const c = a.departmentName.localeCompare(b.departmentName);
      if (c !== 0) return c;
    }
    return comparePeople(a, b);
  });
}

// ---------------- Tashkiliy daraxt ----------------

const toLite = (p: PersonInput): PersonLite => ({
  id: p.id,
  fullName: p.fullName,
  avatarUrl: p.avatarUrl,
  position: p.position,
  positionTitle: p.positionTitle,
  awayToday: p.awayToday,
});

/**
 * Boʻlimlar daraxtini xotirada quradi. parent_department_id dagi sikllar va juda chuqur
 * zanjirlar xavfsiz: har bir boʻlim aynan bir marta (visited) qayta ishlanadi, chuqurlik
 * MAX_TREE_DEPTH bilan cheklangan. Ildizga ulanmay qolgan (sikl/chuqurlik) boʻlimlar
 * yoʻqolmaydi — ular yuqori darajaga chiqariladi.
 */
export function buildOrgTree(input: {
  departments: DeptInput[];
  people: PersonInput[];
  coordinators: Array<{ departmentId: string; userId: string }>;
}): OrgTree {
  const byId = new Map(input.people.map((p) => [p.id, p]));
  const deptIds = new Set(input.departments.map((d) => d.id));

  const leadership = input.people.filter((p) => LEADERSHIP_POSITIONS.includes(p.position)).sort(comparePeople);
  const leaderIds = new Set(leadership.map((p) => p.id));

  const headIds = new Set<string>();
  for (const d of input.departments) if (d.headUserId && byId.has(d.headUserId)) headIds.add(d.headUserId);

  const membersByDept = new Map<string, PersonInput[]>();
  const unassigned: PersonInput[] = [];
  for (const p of input.people) {
    if (leaderIds.has(p.id)) continue;
    if (p.departmentId && deptIds.has(p.departmentId)) {
      const list = membersByDept.get(p.departmentId) ?? [];
      list.push(p);
      membersByDept.set(p.departmentId, list);
    } else if (!headIds.has(p.id)) {
      unassigned.push(p);
    }
  }

  const coordByDept = new Map<string, PersonInput[]>();
  for (const c of input.coordinators) {
    const p = byId.get(c.userId);
    if (!p || !deptIds.has(c.departmentId)) continue;
    const list = coordByDept.get(c.departmentId) ?? [];
    if (!list.some((x) => x.id === p.id)) list.push(p);
    coordByDept.set(c.departmentId, list);
  }

  const byName = (a: DeptInput, b: DeptInput) => a.name.localeCompare(b.name);
  const sorted = [...input.departments].sort(byName);
  const childrenOf = new Map<string | null, DeptInput[]>();
  for (const d of sorted) {
    const parent =
      d.parentDepartmentId && d.parentDepartmentId !== d.id && deptIds.has(d.parentDepartmentId) ? d.parentDepartmentId : null;
    const list = childrenOf.get(parent) ?? [];
    list.push(d);
    childrenOf.set(parent, list);
  }

  const visited = new Set<string>();
  const build = (d: DeptInput, depth: number): DeptNode => {
    visited.add(d.id);
    const headP = d.headUserId ? byId.get(d.headUserId) ?? null : null;
    const members = (membersByDept.get(d.id) ?? []).filter((p) => p.id !== headP?.id).sort(comparePeople);
    const children: DeptNode[] = [];
    if (depth + 1 < MAX_TREE_DEPTH) {
      for (const c of childrenOf.get(d.id) ?? []) {
        if (!visited.has(c.id)) children.push(build(c, depth + 1));
      }
    }
    const all = headP ? [headP, ...members] : members;
    return {
      id: d.id,
      name: d.name,
      head: headP ? toLite(headP) : null,
      coordinators: (coordByDept.get(d.id) ?? []).sort(comparePeople).map(toLite),
      members: members.map(toLite),
      memberCount: all.length,
      awayToday: all.filter((p) => p.awayToday).length,
      children,
    };
  };

  const roots: DeptNode[] = [];
  for (const d of childrenOf.get(null) ?? []) if (!visited.has(d.id)) roots.push(build(d, 0));
  // Sikl yoki chuqurlik chegarasi tufayli ildizga ulanmay qolganlar.
  for (const d of sorted) if (!visited.has(d.id)) roots.push(build(d, 0));

  return {
    leadership: leadership.map(toLite),
    departments: roots,
    unassigned: unassigned.sort(comparePeople).map(toLite),
  };
}

/** Daraxtni chuqurlik boʻyicha tekis roʻyxatga aylantiradi (ota boʻlim — bolalaridan oldin). */
export function flattenTree(nodes: DeptNode[], depth = 0, out: Array<{ node: DeptNode; depth: number }> = []) {
  for (const n of nodes) {
    out.push({ node: n, depth });
    flattenTree(n.children, depth + 1, out);
  }
  return out;
}

// ---------------- Kontakt karta maydonlari ----------------

export const TELEGRAM_RE = /^[A-Za-z0-9_]{5,32}$/;
export const PHONE_RE = /^[+0-9 ()-]{0,50}$/;
export const MAX_SKILLS = 15;
export const MAX_SKILL_LEN = 40;

/** Boshidagi "@" ni (va t.me havolasini) olib tashlaydi. */
export function normalizeTelegram(raw: string): string {
  return raw
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?(t|telegram)\.me\//i, "")
    .replace(/^@+/, "")
    .trim();
}

export function normalizeSkill(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Kichik harf, boʻsh joylar qisqartirilgan, boʻshlari va takrorlari olib tashlangan koʻnikmalar. */
export function normalizeSkills(list: string[]): string[] {
  const out: string[] = [];
  for (const s of list) {
    const v = normalizeSkill(s);
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

// ---------------- vCard 3.0 ----------------

/** vCard matn qiymatini ekranlaydi: \ , ; va qator oxiri. */
export function escapeVCard(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** RFC 2425 boʻyicha qatorni 75 oktetdan katta boʻlmagan boʻlaklarga boʻladi (UTF-8 belgilarni buzmasdan). */
export function foldVCardLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) {
      parts.push(cur);
      cur = "";
      curBytes = 0;
      limit = 74; // davom qatorlari bitta boʻsh joy bilan boshlanadi
    }
    cur += ch;
    curBytes += b;
  }
  if (cur) parts.push(cur);
  return parts.join("\r\n ");
}

/** "Familiya Ism Otasining ismi" → [familiya, ism, qolgani]. */
export function splitFullName(fullName: string): { family: string; given: string; additional: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { family: "", given: "", additional: "" };
  if (parts.length === 1) return { family: "", given: parts[0], additional: "" };
  return { family: parts[0], given: parts[1], additional: parts.slice(2).join(" ") };
}

export type VCardInput = {
  fullName: string;
  org: string;
  department: string | null;
  title: string | null;
  email: string | null;
  workPhone: string | null;
  internalExt: string | null;
  mobile: string | null;
  telegramUsername: string | null;
};

export function buildVCard(v: VCardInput): string {
  const n = splitFullName(v.fullName);
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  lines.push(`N:${escapeVCard(n.family)};${escapeVCard(n.given)};${escapeVCard(n.additional)};;`);
  lines.push(`FN:${escapeVCard(v.fullName.trim())}`);
  lines.push(v.department ? `ORG:${escapeVCard(v.org)};${escapeVCard(v.department)}` : `ORG:${escapeVCard(v.org)}`);
  if (v.title) lines.push(`TITLE:${escapeVCard(v.title)}`);
  if (v.email) lines.push(`EMAIL;TYPE=WORK:${escapeVCard(v.email)}`);
  if (v.workPhone) {
    const ext = v.internalExt ? ` ext. ${v.internalExt}` : "";
    lines.push(`TEL;TYPE=WORK:${escapeVCard(v.workPhone + ext)}`);
  }
  if (v.mobile) lines.push(`TEL;TYPE=CELL:${escapeVCard(v.mobile)}`);
  if (v.telegramUsername) lines.push(`URL:https://t.me/${v.telegramUsername}`);
  lines.push("END:VCARD");
  return lines.map(foldVCardLine).join("\r\n") + "\r\n";
}

const CYR_TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ғ: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y",
  к: "k", қ: "q", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ў: "o",
  ф: "f", х: "x", ҳ: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
};

/** Fayl nomi uchun ASCII: "Murodxoʻjayev Baxtiyor" → "Murodxojayev-Baxtiyor". */
export function latinizeFileName(name: string, fallback = "contact"): string {
  const lat = Array.from(name.normalize("NFC"))
    .map((ch) => {
      const low = ch.toLowerCase();
      const m = CYR_TO_LAT[low];
      if (m === undefined) return ch;
      return ch !== low && m ? m.charAt(0).toUpperCase() + m.slice(1) : m;
    })
    .join("")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ʻʼʹ‘’`´']/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return lat || fallback;
}
