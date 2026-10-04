import "server-only";
import { and, asc, desc, eq, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { departments, users, type Position } from "@/lib/db/schema";
import {
  announcements,
  announcementReads,
  announcementPolls,
  announcementPollOptions,
  announcementPollVotes,
  type AnnouncementImportance,
} from "@/lib/db/tables/announcements";
import {
  allowedDepartmentIds,
  audienceVisibleSql,
  resolveAudience,
  AUDIENCE_POSITIONS,
  type Audience,
} from "@/lib/audience";
import {
  ANNOUNCEMENTS_PAGE_SIZE,
  canManageAnnouncement,
  canPostAnnouncements,
  canSeeReceipts,
  isPollClosed,
  makeExcerpt,
} from "@/components/staff/announcements/logic";

// Eʼlonlar uchun oʻqish soʻrovlari. Yangi jadvallardan (0031) har bir oʻqish
// try/catch bilan himoyalangan: migratsiya hali qoʻllanmagan boʻlsa sahifa
// buzilmaydi — shunchaki boʻsh natija qaytadi.

export type AnnouncementViewer = {
  id: string;
  position: Position;
  departmentId: string | null;
  email?: string | null;
};

export type AnnouncementCard = {
  id: string;
  title: string;
  excerpt: string;
  importance: AnnouncementImportance;
  pinnedUntil: Date | null;
  /** pinned_until hali oʻtmagan */
  pinned: boolean;
  createdAt: Date;
  authorName: string | null;
  authorAvatar: string | null;
  isRead: boolean;
  hasPoll: boolean;
  attachmentName: string | null;
};

export type PollOptionResult = { id: string; label: string; votes: number; voters?: string[] };

export type AnnouncementPoll = {
  question: string;
  multi: boolean;
  anonymous: boolean;
  closesAt: Date | null;
  closed: boolean;
  options: PollOptionResult[];
  myOptionIds: string[];
  totalVoters: number;
};

export type AnnouncementDetail = AnnouncementCard & {
  body: string | null;
  attachmentUrl: string | null;
  audience: Audience;
  audienceDepartments: { id: string; name: string }[];
  expiresAt: Date | null;
  authorId: string | null;
  isAuthor: boolean;
  canManage: boolean;
  canSeeReceipts: boolean;
  poll: AnnouncementPoll | null;
};

export type ReadReceipts = {
  read: number;
  total: number;
  unread: { id: string; fullName: string; avatarUrl: string | null; departmentName: string | null }[];
  lastRemindedAt: Date | null;
};

export type PinnedAnnouncement = { id: string; title: string; importance: AnnouncementImportance };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID_RE.test(s);

// ---------------- predikatlar ----------------

const notExpired = (): SQL => sql`(${announcements.expiresAt} is null or ${announcements.expiresAt} > now())`;
const pinnedActive = (): SQL<boolean> =>
  sql<boolean>`(${announcements.pinnedUntil} is not null and ${announcements.pinnedUntil} > now())`;

/** Lenta: muallif yoki auditoriyaga mos, muddati oʻtmagan. */
function feedVisible(me: AnnouncementViewer): SQL {
  return and(or(eq(announcements.authorUserId, me.id), audienceVisibleSql(announcements.audience, me)), notExpired())!;
}

/**
 * Bitta eʼlonga kirish (batafsil sahifa, oʻqildi, ovoz berish): muallif har doim;
 * boshqalar — auditoriyaga mos va muddati oʻtmagan boʻlsa.
 */
export function announcementAccessWhere(me: AnnouncementViewer): SQL {
  return or(eq(announcements.authorUserId, me.id), and(audienceVisibleSql(announcements.audience, me), notExpired()))!;
}

const isReadSql = (me: AnnouncementViewer) =>
  sql<boolean>`exists(select 1 from ${announcementReads} where ${announcementReads.announcementId} = ${announcements.id} and ${announcementReads.userId} = ${me.id})`;
const hasPollSql = () =>
  sql<boolean>`exists(select 1 from ${announcementPolls} where ${announcementPolls.announcementId} = ${announcements.id})`;

/** Eʼlon yozish huquqi (lavozim boʻyicha; auditoriya cheklovi alohida — canSendToAudience). */
export function canPost(me: AnnouncementViewer): boolean {
  return canPostAnnouncements(me);
}

// ---------------- lenta ----------------

export async function listAnnouncements(
  me: AnnouncementViewer,
  page = 1
): Promise<{ rows: AnnouncementCard[]; total: number }> {
  if (me.position === "kontragent") return { rows: [], total: 0 };
  const p = Math.max(1, Math.floor(Number(page)) || 1);
  try {
    const where = feedVisible(me);
    const [rows, counts] = await Promise.all([
      db
        .select({
          id: announcements.id,
          title: announcements.title,
          bodyHead: sql<string | null>`left(${announcements.body}, 800)`,
          importance: announcements.importance,
          pinnedUntil: announcements.pinnedUntil,
          pinned: pinnedActive(),
          createdAt: announcements.createdAt,
          authorName: users.fullName,
          authorAvatar: users.avatarUrl,
          isRead: isReadSql(me),
          hasPoll: hasPollSql(),
          attachmentName: announcements.attachmentName,
        })
        .from(announcements)
        .leftJoin(users, eq(users.id, announcements.authorUserId))
        .where(where)
        .orderBy(desc(pinnedActive()), desc(announcements.createdAt))
        .limit(ANNOUNCEMENTS_PAGE_SIZE)
        .offset((p - 1) * ANNOUNCEMENTS_PAGE_SIZE),
      db.select({ n: sql<number>`count(*)::int` }).from(announcements).where(where),
    ]);
    return {
      rows: rows.map(({ bodyHead, ...r }) => ({
        ...r,
        excerpt: makeExcerpt(bodyHead, 280),
        pinned: !!r.pinned,
        isRead: !!r.isRead,
        hasPoll: !!r.hasPoll,
      })),
      total: Number(counts[0]?.n ?? 0),
    };
  } catch {
    return { rows: [], total: 0 };
  }
}

// ---------------- batafsil ----------------

export async function getAnnouncement(me: AnnouncementViewer, id: string): Promise<AnnouncementDetail | null> {
  if (me.position === "kontragent" || !isUuid(id)) return null;
  try {
    const [row] = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
        attachmentUrl: announcements.attachmentUrl,
        attachmentName: announcements.attachmentName,
        audience: announcements.audience,
        importance: announcements.importance,
        pinnedUntil: announcements.pinnedUntil,
        pinned: pinnedActive(),
        expiresAt: announcements.expiresAt,
        createdAt: announcements.createdAt,
        authorId: announcements.authorUserId,
        authorName: users.fullName,
        authorAvatar: users.avatarUrl,
        isRead: isReadSql(me),
        hasPoll: hasPollSql(),
      })
      .from(announcements)
      .leftJoin(users, eq(users.id, announcements.authorUserId))
      .where(and(eq(announcements.id, id), announcementAccessWhere(me)))
      .limit(1);
    if (!row) return null;

    const isAuthor = !!row.authorId && row.authorId === me.id;
    const receipts = canSeeReceipts(me, row.authorId);

    let audienceDepartments: { id: string; name: string }[] = [];
    if ("departmentIds" in row.audience && row.audience.departmentIds.length > 0) {
      audienceDepartments = await db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(inArray(departments.id, row.audience.departmentIds));
    }

    const poll = row.hasPoll ? await loadPoll(id, me, receipts) : null;

    return {
      id: row.id,
      title: row.title,
      excerpt: makeExcerpt(row.body, 280),
      body: row.body,
      attachmentUrl: row.attachmentUrl,
      attachmentName: row.attachmentName,
      audience: row.audience,
      audienceDepartments,
      importance: row.importance,
      pinnedUntil: row.pinnedUntil,
      pinned: !!row.pinned,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      authorId: row.authorId,
      authorName: row.authorName,
      authorAvatar: row.authorAvatar,
      isRead: !!row.isRead,
      hasPoll: !!row.hasPoll,
      isAuthor,
      canManage: canManageAnnouncement(me, row.authorId),
      canSeeReceipts: receipts,
      poll,
    };
  } catch {
    return null;
  }
}

/**
 * Soʻrovnoma natijalari. Anonim soʻrovnomada hech qachon ovoz berganlar shaxsi
 * soʻralmaydi — faqat agregat sonlar (va koʻruvchining OʻZ tanlovi).
 * Ochiq soʻrovnomada ismlar faqat muallif / direktor / oʻrinbosar / HR ga.
 */
async function loadPoll(id: string, me: AnnouncementViewer, privileged: boolean): Promise<AnnouncementPoll | null> {
  try {
    const [poll] = await db
      .select()
      .from(announcementPolls)
      .where(eq(announcementPolls.announcementId, id))
      .limit(1);
    if (!poll) return null;

    const [options, counts, totals, mine] = await Promise.all([
      db
        .select({ id: announcementPollOptions.id, label: announcementPollOptions.label })
        .from(announcementPollOptions)
        .where(eq(announcementPollOptions.announcementId, id))
        .orderBy(asc(announcementPollOptions.orderIndex), asc(announcementPollOptions.label)),
      db
        .select({ optionId: announcementPollVotes.optionId, n: sql<number>`count(*)::int` })
        .from(announcementPollVotes)
        .where(eq(announcementPollVotes.announcementId, id))
        .groupBy(announcementPollVotes.optionId),
      db
        .select({ n: sql<number>`count(distinct ${announcementPollVotes.userId})::int` })
        .from(announcementPollVotes)
        .where(eq(announcementPollVotes.announcementId, id)),
      db
        .select({ optionId: announcementPollVotes.optionId })
        .from(announcementPollVotes)
        .where(and(eq(announcementPollVotes.announcementId, id), eq(announcementPollVotes.userId, me.id))),
    ]);

    const countMap = new Map(counts.map((c) => [c.optionId, Number(c.n)]));

    let votersByOption: Map<string, string[]> | null = null;
    if (!poll.anonymous && privileged) {
      const voters = await db
        .select({ optionId: announcementPollVotes.optionId, fullName: users.fullName })
        .from(announcementPollVotes)
        .innerJoin(users, eq(users.id, announcementPollVotes.userId))
        // Yashirin (hidden) akkauntlar ismlar roʻyxatida koʻrsatilmaydi (soni agregatda qoladi).
        .where(and(eq(announcementPollVotes.announcementId, id), eq(users.hidden, false)))
        .orderBy(asc(users.fullName));
      votersByOption = new Map();
      for (const v of voters) {
        const list = votersByOption.get(v.optionId) ?? [];
        list.push(v.fullName);
        votersByOption.set(v.optionId, list);
      }
    }

    return {
      question: poll.question,
      multi: poll.multi,
      anonymous: poll.anonymous,
      closesAt: poll.closesAt,
      closed: isPollClosed(poll.closesAt),
      options: options.map((o) => ({
        id: o.id,
        label: o.label,
        votes: countMap.get(o.id) ?? 0,
        ...(votersByOption ? { voters: votersByOption.get(o.id) ?? [] } : {}),
      })),
      myOptionIds: mine.map((m) => m.optionId),
      totalVoters: Number(totals[0]?.n ?? 0),
    };
  } catch {
    return null;
  }
}

// ---------------- koʻrilganlik ----------------

/** Auditoriya (muallifsiz) ichidan hali koʻrmaganlar id'lari va jami soni. */
export async function getUnreadRecipientIds(
  id: string,
  audience: Audience,
  authorId: string | null
): Promise<{ recipients: string[]; unread: string[] }> {
  const recipients = (await resolveAudience(audience)).filter((u) => u !== authorId);
  if (recipients.length === 0) return { recipients, unread: [] };
  const reads = await db
    .select({ userId: announcementReads.userId })
    .from(announcementReads)
    .where(eq(announcementReads.announcementId, id));
  const readSet = new Set(reads.map((r) => r.userId));
  return { recipients, unread: recipients.filter((u) => !readSet.has(u)) };
}

export async function getReadReceipts(me: AnnouncementViewer, id: string): Promise<ReadReceipts | null> {
  if (me.position === "kontragent" || !isUuid(id)) return null;
  try {
    const [row] = await db
      .select({
        audience: announcements.audience,
        authorId: announcements.authorUserId,
        lastRemindedAt: announcements.lastRemindedAt,
      })
      .from(announcements)
      .where(and(eq(announcements.id, id), announcementAccessWhere(me)))
      .limit(1);
    if (!row || !canSeeReceipts(me, row.authorId)) return null;

    const { recipients, unread } = await getUnreadRecipientIds(id, row.audience, row.authorId);
    const people =
      unread.length === 0
        ? []
        : await db
            .select({
              id: users.id,
              fullName: users.fullName,
              avatarUrl: users.avatarUrl,
              departmentName: departments.name,
            })
            .from(users)
            .leftJoin(departments, eq(departments.id, users.departmentId))
            .where(inArray(users.id, unread))
            .orderBy(asc(departments.name), asc(users.fullName));

    return {
      read: recipients.length - unread.length,
      total: recipients.length,
      unread: people.map((p) => ({ ...p, departmentName: p.departmentName ?? null })),
      lastRemindedAt: row.lastRemindedAt,
    };
  } catch {
    return null;
  }
}

// ---------------- dashboard banneri ----------------

/** Qadalgan, muddati oʻtmagan, men hali oʻqimagan eʼlonlar (koʻpi bilan 3 ta; muhimlari oldin). */
export async function getActivePinned(me: AnnouncementViewer): Promise<PinnedAnnouncement[]> {
  if (me.position === "kontragent") return [];
  try {
    return await db
      .select({ id: announcements.id, title: announcements.title, importance: announcements.importance })
      .from(announcements)
      .where(and(feedVisible(me), pinnedActive(), sql`not ${isReadSql(me)}`))
      .orderBy(desc(sql`(${announcements.importance} = 'important')`), desc(announcements.createdAt))
      .limit(3);
  } catch {
    return [];
  }
}

// ---------------- yozish formasi uchun maʼlumot ----------------

export type ComposerPerson = {
  id: string;
  fullName: string;
  position: string;
  departmentName: string | null;
  avatarUrl: string | null;
};

export type ComposerOptions = {
  allowed: "any" | string[];
  departments: { id: string; name: string }[];
  positions: string[];
  people: ComposerPerson[];
};

/** Forma uchun: ruxsat etilgan boʻlimlar, lavozimlar ("any" uchun) va xodimlar (faol, ichki, yashirin emas). */
export async function getComposerOptions(me: AnnouncementViewer): Promise<ComposerOptions> {
  const empty: ComposerOptions = { allowed: [], departments: [], positions: [], people: [] };
  if (!canPostAnnouncements(me)) return empty;
  try {
    const allowed = await allowedDepartmentIds(me);
    if (allowed !== "any" && allowed.length === 0) return { ...empty, allowed };

    const deptRows = await db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(allowed === "any" ? undefined : inArray(departments.id, allowed))
      .orderBy(asc(departments.name));

    const staffWhere = and(
      eq(users.status, "active"),
      eq(users.hidden, false),
      ne(users.position, "kontragent"),
      ne(users.id, me.id),
      allowed === "any" ? undefined : inArray(users.departmentId, allowed)
    );
    const people = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        position: users.position,
        departmentName: departments.name,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .leftJoin(departments, eq(departments.id, users.departmentId))
      .where(staffWhere)
      .orderBy(asc(users.fullName));

    return {
      allowed,
      departments: deptRows,
      positions: allowed === "any" ? [...AUDIENCE_POSITIONS] : [],
      people: people.map((p) => ({ ...p, departmentName: p.departmentName ?? null })),
    };
  } catch {
    return empty;
  }
}
