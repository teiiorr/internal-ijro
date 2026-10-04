"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { notifications, notificationSettings } from "@/lib/db/schema";
import {
  announcements,
  announcementReads,
  announcementPolls,
  announcementPollOptions,
  announcementPollVotes,
  ANNOUNCEMENT_IMPORTANCE,
} from "@/lib/db/tables/announcements";
import { requireUser, type SessionUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { publishNotification } from "@/lib/realtime/bus";
import { clampNotificationTitle } from "@/lib/notifications/deliver";
import { storeFile, deleteFileByUrl, isForbiddenExt } from "@/lib/upload";
import { audienceSchema, canSendToAudience, resolveAudience, type Audience } from "@/lib/audience";
import { announcementAccessWhere, getUnreadRecipientIds } from "@/server/queries/announcements";
import {
  ANNOUNCEMENT_MAX_FILE_BYTES,
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  REMIND_COOLDOWN_HOURS,
  canManageAnnouncement,
  canPostAnnouncements,
  canSeeReceipts,
  chunk,
  endOfDayTashkent,
  isPollClosed,
  isYmd,
  makeExcerpt,
  normalizePollOptions,
  tashkentYmd,
  todayTashkentYmd,
  validateVoteSelection,
  type ActionResult,
} from "@/components/staff/announcements/logic";

// Kutilgan xatolar (huquq yoʻq, notoʻgʻri maʼlumot, 12 soatlik cheklov) throw emas,
// { ok:false, error } qiymati sifatida qaytadi — prod build'da Next server action
// xabarlarini yashiradi, mijoz esa aniq kod boʻyicha tarjima qilingan toast koʻrsatadi.

const fail = (error: string) => ({ ok: false as const, error });

function revalidateAll(id?: string) {
  revalidatePath("/elonlar");
  if (id) revalidatePath(`/elonlar/${id}`);
  revalidatePath("/dashboard");
}

/** "" / null → null; aks holda haqiqiy YYYY-MM-DD boʻlishi shart. */
const ymdOrNull = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v ? v.trim() : ""))
  .refine((v) => v === "" || isYmd(v), { message: "invalid_date" })
  .transform((v) => (v === "" ? null : v));

/** Sana bugundan (Toshkent) oldin boʻlmasligi kerak. `keep` — oʻzgarmagan eski qiymat (tekshirilmaydi). */
function pastDate(ymd: string | null, keep?: string | null): boolean {
  if (!ymd || (keep && ymd === keep)) return false;
  return ymd < todayTashkentYmd();
}

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

/** Faqat ilova ichidagi bildirishnoma (oddiy eʼlon): in-app oʻchirganlar chiqarib tashlanadi, 200 tadan insert, so'ng SSE signal. */
async function notifyInAppOnly(
  userIds: string[],
  n: { type: string; title: string; message: string; link: string; entityId: string }
) {
  if (userIds.length === 0) return;
  const off = new Set<string>();
  for (const part of chunk(userIds, 500)) {
    const rows = await db
      .select({ userId: notificationSettings.userId, inApp: notificationSettings.inAppEnabled })
      .from(notificationSettings)
      .where(inArray(notificationSettings.userId, part));
    for (const r of rows) if (!r.inApp) off.add(r.userId);
  }
  const targets = userIds.filter((u) => !off.has(u));
  for (const part of chunk(targets, 200)) {
    await db.insert(notifications).values(
      part.map((userId) => ({
        userId,
        type: n.type,
        title: clampNotificationTitle(n.title),
        message: n.message,
        link: n.link,
        relatedEntityType: "announcement",
        relatedEntityId: n.entityId,
      }))
    );
  }
  for (const uid of targets) publishNotification(uid);
}

/** Bitta eʼlonga kirish huquqini tekshirib, kerakli ustunlarni qaytaradi (yoʻq/koʻrinmas → null). */
async function loadAccessible(me: SessionUser, id: string) {
  const [row] = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      audience: announcements.audience,
      authorId: announcements.authorUserId,
      attachmentUrl: announcements.attachmentUrl,
      pinnedUntil: announcements.pinnedUntil,
      expiresAt: announcements.expiresAt,
    })
    .from(announcements)
    .where(and(eq(announcements.id, id), announcementAccessWhere(me)))
    .limit(1);
  return row ?? null;
}

const idSchema = z.guid();

// ---------------- yaratish ----------------

const createSchema = z.object({
  title: z.string().trim().min(3).max(255),
  body: z.string().trim().max(20000),
  importance: z.enum(ANNOUNCEMENT_IMPORTANCE),
  pinnedUntil: ymdOrNull,
  expiresAt: ymdOrNull,
});

const pollSchema = z.object({
  question: z.string().trim().min(1).max(500),
  options: z.array(z.string().max(255)).max(POLL_MAX_OPTIONS * 2),
  multi: z.boolean().default(false),
  anonymous: z.boolean().default(false),
  closesAt: ymdOrNull,
});

export async function createAnnouncement(fd: FormData): Promise<ActionResult<{ id: string }>> {
  const me = await requireUser();
  if (!canPostAnnouncements(me)) return fail("forbidden");

  const parsed = createSchema.safeParse({
    title: str(fd, "title"),
    body: str(fd, "body"),
    importance: str(fd, "importance") || "normal",
    pinnedUntil: str(fd, "pinnedUntil"),
    expiresAt: str(fd, "expiresAt"),
  });
  if (!parsed.success) {
    const dateIssue = parsed.error.issues.some((i) => i.message === "invalid_date");
    return fail(dateIssue ? "invalid_date" : "invalid_input");
  }
  const v = parsed.data;
  if (pastDate(v.pinnedUntil) || pastDate(v.expiresAt)) return fail("date_in_past");

  // Auditoriya — JSON qator, qatʼiy sxema bilan.
  let audience: Audience;
  try {
    const a = audienceSchema.safeParse(JSON.parse(str(fd, "audience") || "null"));
    if (!a.success) return fail("invalid_audience");
    audience = a.data;
  } catch {
    return fail("invalid_audience");
  }

  // Ixtiyoriy soʻrovnoma.
  let poll: { question: string; options: string[]; multi: boolean; anonymous: boolean; closesAt: string | null } | null =
    null;
  const pollRaw = str(fd, "poll");
  if (pollRaw) {
    try {
      const pp = pollSchema.safeParse(JSON.parse(pollRaw));
      if (!pp.success) return fail("poll_invalid");
      const options = normalizePollOptions(pp.data.options);
      if (options.length < POLL_MIN_OPTIONS || options.length > POLL_MAX_OPTIONS) return fail("poll_invalid");
      if (pastDate(pp.data.closesAt)) return fail("date_in_past");
      poll = { ...pp.data, options };
    } catch {
      return fail("poll_invalid");
    }
  }

  // Ixtiyoriy ilova fayl — yozuvdan OLDIN tekshiramiz.
  const fileEntry = fd.get("file");
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
  if (file) {
    if (file.size > ANNOUNCEMENT_MAX_FILE_BYTES) return fail("file_too_large");
    if (isForbiddenExt(file.name)) return fail("ext_forbidden");
  }

  // RBAC: boʻlim boshligʻi / koordinator faqat oʻz boʻlim(lar)iga.
  if (!(await canSendToAudience(me, audience))) return fail("forbidden_audience");

  const recipients = (await resolveAudience(audience)).filter((u) => u !== me.id);
  if (recipients.length === 0) return fail("empty_audience");

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(announcements)
      .values({
        title: v.title,
        body: v.body || null,
        audience,
        importance: v.importance,
        pinnedUntil: v.pinnedUntil ? endOfDayTashkent(v.pinnedUntil) : null,
        expiresAt: v.expiresAt ? endOfDayTashkent(v.expiresAt) : null,
        authorUserId: me.id,
      })
      .returning({ id: announcements.id });
    if (poll) {
      await tx.insert(announcementPolls).values({
        announcementId: row.id,
        question: poll.question,
        multi: poll.multi,
        anonymous: poll.anonymous,
        closesAt: poll.closesAt ? endOfDayTashkent(poll.closesAt) : null,
      });
      await tx
        .insert(announcementPollOptions)
        .values(poll.options.map((label, i) => ({ announcementId: row.id, label, orderIndex: i })));
    }
    // Muallif oʻz eʼlonini "koʻrgan" — banner/nuqta unga chiqmaydi (koʻrilganlik hisobiga kirmaydi).
    await tx.insert(announcementReads).values({ announcementId: row.id, userId: me.id }).onConflictDoNothing();
    return row.id;
  });

  if (file) {
    try {
      const stored = await storeFile(file, `announcements/${id}`);
      await db
        .update(announcements)
        .set({ attachmentUrl: stored.url, attachmentName: stored.originalName.slice(0, 255) })
        .where(eq(announcements.id, id));
    } catch (e) {
      // Fayl saqlanmadi — chala eʼlon qolmasin.
      await db.delete(announcements).where(eq(announcements.id, id));
      const msg = e instanceof Error ? e.message : "";
      return fail(["file_too_large", "file_empty", "ext_forbidden"].includes(msg) ? msg : "upload_failed");
    }
  }

  const excerpt = makeExcerpt(v.body, 280) || v.title;
  const link = `/elonlar/${id}`;
  try {
    if (v.importance === "important") {
      // Muhim: in-app + email + Telegram (har kimning sozlamasiga koʻra) + SSE qoʻngʻiroq.
      await notify({
        userIds: recipients,
        type: "announcement.important",
        title: v.title,
        message: excerpt,
        link,
        entityType: "announcement",
        entityId: id,
      });
    } else {
      await notifyInAppOnly(recipients, { type: "announcement.new", title: v.title, message: excerpt, link, entityId: id });
    }
  } catch (e) {
    // Bildirishnoma xatosi eʼlonni bekor qilmaydi (aks holda qayta yuborishda dublikat paydo boʻladi).
    console.error("[announcements] notify failed", e);
  }

  await logActivity({
    userId: me.id,
    action: "announcement.created",
    entityType: "announcement",
    entityId: id,
    newValue: { title: v.title, importance: v.importance, audience, recipients: recipients.length, poll: !!poll },
  });
  revalidateAll();
  return { ok: true, id };
}

// ---------------- tahrirlash ----------------

const updateSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(3).max(255),
  body: z.string().trim().max(20000).nullable().optional(),
  pinnedUntil: ymdOrNull,
  expiresAt: ymdOrNull,
});

export async function updateAnnouncement(input: {
  id: string;
  title: string;
  body?: string | null;
  pinnedUntil?: string | null;
  expiresAt?: string | null;
}): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    const dateIssue = parsed.error.issues.some((i) => i.message === "invalid_date");
    return fail(dateIssue ? "invalid_date" : "invalid_input");
  }
  const v = parsed.data;

  const [row] = await db
    .select({
      authorId: announcements.authorUserId,
      title: announcements.title,
      body: announcements.body,
      pinnedUntil: announcements.pinnedUntil,
      expiresAt: announcements.expiresAt,
    })
    .from(announcements)
    .where(eq(announcements.id, v.id))
    .limit(1);
  if (!row) return fail("not_found");
  if (!canManageAnnouncement(me, row.authorId)) return fail("forbidden");

  const oldPinned = row.pinnedUntil ? tashkentYmd(row.pinnedUntil) : null;
  const oldExpires = row.expiresAt ? tashkentYmd(row.expiresAt) : null;
  if (pastDate(v.pinnedUntil, oldPinned) || pastDate(v.expiresAt, oldExpires)) return fail("date_in_past");

  // Berilmagan (undefined) maydonlar oʻzgarmaydi; "" / null — tozalash.
  const next = {
    title: v.title,
    body: input.body === undefined ? row.body : v.body || null,
    pinnedUntil:
      input.pinnedUntil === undefined ? row.pinnedUntil : v.pinnedUntil ? endOfDayTashkent(v.pinnedUntil) : null,
    expiresAt: input.expiresAt === undefined ? row.expiresAt : v.expiresAt ? endOfDayTashkent(v.expiresAt) : null,
  };
  await db
    .update(announcements)
    .set({ ...next, updatedAt: new Date() })
    .where(eq(announcements.id, v.id));

  await logActivity({
    userId: me.id,
    action: "announcement.updated",
    entityType: "announcement",
    entityId: v.id,
    oldValue: { title: row.title, pinnedUntil: oldPinned, expiresAt: oldExpires, bodyChanged: false },
    newValue: {
      title: v.title,
      pinnedUntil: next.pinnedUntil ? tashkentYmd(next.pinnedUntil) : null,
      expiresAt: next.expiresAt ? tashkentYmd(next.expiresAt) : null,
      bodyChanged: (row.body ?? "") !== (next.body ?? ""),
    },
  });
  revalidateAll(v.id);
  return { ok: true };
}

// ---------------- oʻchirish ----------------

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const me = await requireUser();
  if (!idSchema.safeParse(id).success) return fail("invalid_input");

  const [row] = await db
    .select({ authorId: announcements.authorUserId, title: announcements.title, attachmentUrl: announcements.attachmentUrl })
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);
  if (!row) return fail("not_found");
  if (!canManageAnnouncement(me, row.authorId)) return fail("forbidden");

  await db.delete(announcements).where(eq(announcements.id, id));
  if (row.attachmentUrl) await deleteFileByUrl(row.attachmentUrl);
  try {
    // Oʻchirilgan eʼlonga olib boruvchi (endi 404) bildirishnomalarni ham tozalaymiz.
    await db
      .delete(notifications)
      .where(and(eq(notifications.relatedEntityType, "announcement"), eq(notifications.relatedEntityId, id)));
  } catch {
    /* ahamiyatsiz */
  }

  await logActivity({
    userId: me.id,
    action: "announcement.deleted",
    entityType: "announcement",
    entityId: id,
    oldValue: { title: row.title },
  });
  revalidateAll(id);
  return { ok: true };
}

// ---------------- oʻqildi ----------------

export async function markAnnouncementRead(id: string): Promise<ActionResult> {
  const me = await requireUser();
  if (me.position === "kontragent") return fail("forbidden");
  if (!idSchema.safeParse(id).success) return fail("invalid_input");

  const row = await loadAccessible(me, id);
  if (!row) return fail("not_found");

  const inserted = await db
    .insert(announcementReads)
    .values({ announcementId: id, userId: me.id })
    .onConflictDoNothing()
    .returning({ id: announcementReads.announcementId });
  if (inserted.length > 0) {
    // Lentadagi "Yangi" nuqtasi va dashboard banneri mijoz keshidan eskirgan holda qaytmasin
    // (orqaga qaytishda router keshi ishlatiladi).
    revalidatePath("/elonlar");
    revalidatePath("/dashboard");
  }

  // Shu eʼlon haqidagi bildirishnomalarim ham oʻqilgan boʻladi → qoʻngʻiroq hisoblagichi yangilanadi.
  try {
    const updated = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, me.id),
          eq(notifications.relatedEntityType, "announcement"),
          eq(notifications.relatedEntityId, id),
          eq(notifications.isRead, false)
        )
      )
      .returning({ id: notifications.id });
    if (updated.length > 0) publishNotification(me.id);
  } catch {
    /* ahamiyatsiz */
  }
  return { ok: true };
}

// ---------------- ovoz berish ----------------

const voteSchema = z.object({
  announcementId: idSchema,
  optionIds: z.array(idSchema).max(POLL_MAX_OPTIONS),
});

export async function votePoll(input: { announcementId: string; optionIds: string[] }): Promise<ActionResult> {
  const me = await requireUser();
  if (me.position === "kontragent") return fail("forbidden");
  const parsed = voteSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const { announcementId } = parsed.data;
  const optionIds = Array.from(new Set(parsed.data.optionIds.map((s) => s.toLowerCase())));

  const row = await loadAccessible(me, announcementId);
  if (!row) return fail("not_found");

  const [poll] = await db
    .select({ multi: announcementPolls.multi, closesAt: announcementPolls.closesAt })
    .from(announcementPolls)
    .where(eq(announcementPolls.announcementId, announcementId))
    .limit(1);
  if (!poll) return fail("no_poll");
  if (isPollClosed(poll.closesAt)) return fail("poll_closed");

  const options = await db
    .select({ id: announcementPollOptions.id })
    .from(announcementPollOptions)
    .where(eq(announcementPollOptions.announcementId, announcementId));
  const err = validateVoteSelection({ multi: poll.multi, optionIds, validOptionIds: options.map((o) => o.id) });
  if (err) return fail(err);

  await db.transaction(async (tx) => {
    // Bir foydalanuvchining shu soʻrovnomadagi parallel ovozlari ketma-ket bajarilsin:
    // aks holda ikkita bir vaqtdagi soʻrov (READ COMMITTED) bitta tanlovli soʻrovnomada
    // ikki xil variantni qoldirishi yoki PK toʻqnashuvi bilan yiqilishi mumkin.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`poll:${announcementId}:${me.id}`}::text))`);
    await tx
      .delete(announcementPollVotes)
      .where(and(eq(announcementPollVotes.announcementId, announcementId), eq(announcementPollVotes.userId, me.id)));
    await tx
      .insert(announcementPollVotes)
      .values(optionIds.map((optionId) => ({ optionId, announcementId, userId: me.id })))
      .onConflictDoNothing();
  });
  await db.insert(announcementReads).values({ announcementId, userId: me.id }).onConflictDoNothing();

  revalidatePath(`/elonlar/${announcementId}`);
  return { ok: true };
}

// ---------------- qayta eslatish ----------------

export async function remindUnread(id: string): Promise<ActionResult<{ sent: number }>> {
  const me = await requireUser();
  if (!idSchema.safeParse(id).success) return fail("invalid_input");

  const row = await loadAccessible(me, id);
  if (!row) return fail("not_found");
  if (!canSeeReceipts(me, row.authorId)) return fail("forbidden");

  const { unread } = await getUnreadRecipientIds(id, row.audience, row.authorId);
  if (unread.length === 0) return { ok: true, sent: 0 };

  // Atomar "band qilish": 12 soat ichida ikkinchi marta (hatto parallel bosilsa ham) yuborilmaydi.
  const claimed = await db
    .update(announcements)
    .set({ lastRemindedAt: new Date() })
    .where(
      and(
        eq(announcements.id, id),
        or(
          isNull(announcements.lastRemindedAt),
          lt(announcements.lastRemindedAt, sql`now() - ${sql.raw(`interval '${REMIND_COOLDOWN_HOURS} hours'`)}`)
        )
      )
    )
    .returning({ id: announcements.id });
  if (claimed.length === 0) return fail("too_soon");

  try {
    await notify({
      userIds: unread,
      type: "announcement.reminder",
      title: row.title,
      message: makeExcerpt(row.body, 280) || row.title,
      link: `/elonlar/${id}`,
      entityType: "announcement",
      entityId: id,
    });
  } catch (e) {
    // Hech narsa yuborilmadi (in-app insert yiqildi) — band qilingan 12 soatlik slotni qaytaramiz,
    // aks holda muallif 12 soat davomida qayta urina olmaydi. (Oldin slot boʻsh yoki >12h edi → null ekvivalent.)
    console.error("[announcements] remind failed", e);
    await db.update(announcements).set({ lastRemindedAt: null }).where(eq(announcements.id, id));
    return fail("notify_failed");
  }
  await logActivity({
    userId: me.id,
    action: "announcement.reminded",
    entityType: "announcement",
    entityId: id,
    newValue: { count: unread.length },
  });
  revalidatePath(`/elonlar/${id}`);
  return { ok: true, sent: unread.length };
}
