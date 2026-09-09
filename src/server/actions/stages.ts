"use server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { externalCompanies, projects, projectCurators, projectMessages, projectStages, stageDocuments, stagePayments, users } from "@/lib/db/schema";
import { requireProjectEditor, requireUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { deleteFileByUrl } from "@/lib/upload";
import { recalcProjectProgress } from "@/lib/projects/recalc";

function stageLinks(projectId: string, stageId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/stages/${stageId}`);
  // Studiya tomonidagi sahifalar ham xuddi şu bosqiçni aks ettiradi.
  revalidatePath(`/contractor/projects/${projectId}`);
  revalidatePath(`/contractor/projects/${projectId}/stages/${stageId}`);
  revalidatePath(`/contractor/projects`);
  // Xodimlarning Studiyalar iş maydoni (tekşiruv navbati paneli, katakça belgilari, studiya tafsiloti).
  revalidatePath(`/contractors`);
}

/** Loyiha egasi bölgan studiya (kontragent) foydalanuvçisini kompaniya emaili orqali aniqlaydi. */
async function resolveStudioContactId(projectId: string): Promise<string | null> {
  const [prj] = await db.select({ ec: projects.externalCompanyId }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!prj?.ec) return null;
  const [company] = await db.select({ email: externalCompanies.contactEmail }).from(externalCompanies).where(eq(externalCompanies.id, prj.ec)).limit(1);
  if (!company?.email) return null;
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, company.email)).limit(1);
  return u?.id ?? null;
}

async function directorIds(): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`${users.status}='active' AND ${users.position} in ('direktor','orinbosar')`);
  return rows.map((r) => r.id);
}

/**
 * Joriy faol bosqiçni yakunlaydi va keyingisini oçadi.
 * Qat'iy ketma-ket holat maşinasi: faqat 'active' bosqiçni yakunlaş mumkin.
 */
export async function completeStage(stageId: string) {
  const me = await requireProjectEditor();

  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
    if (rows.length === 0) throw new Error("not_found");
    const stage = rows[0];
    if (stage.status !== "active") throw new Error("stage_not_active");
    const now = new Date();

    await tx
      .update(projectStages)
      .set({
        status: "completed",
        completedAt: now,
        updatedAt: now,
        // eslatma himoyalarini tozalaymiz — keyingi faol bosqiç qaytadan ogohlantira olsin
        reminderApproachingSentAt: null,
        reminderOverdueSentAt: null,
        reminderStaleSentAt: null,
      })
      .where(eq(projectStages.id, stageId));

    // Birlaştirilgan blok: mergeWithNext belgisi qöyilgan bosqiç özidan keyingi
    // bosqiç(lar) bilan birga yakunlanadi — bitta bosişda butun "umumiy bosqiç" tugaydi.
    let last = stage;
    while (last.mergeWithNext) {
      const followRows = await tx
        .select()
        .from(projectStages)
        .where(and(eq(projectStages.projectId, stage.projectId), eq(projectStages.orderIndex, last.orderIndex + 1)))
        .limit(1);
      if (followRows.length === 0) break;
      const follow = followRows[0];
      await tx
        .update(projectStages)
        .set({
          status: "completed",
          startedAt: follow.startedAt ?? now,
          completedAt: now,
          updatedAt: now,
          reminderApproachingSentAt: null,
          reminderOverdueSentAt: null,
          reminderStaleSentAt: null,
        })
        .where(eq(projectStages.id, follow.id));
      last = follow;
    }

    // (Ehtimol birlaştirilgan) blokdan keyingi bosqiçni faollaştiramiz, aks holda loyihani yakunlaymiz.
    const nextRows = await tx
      .select()
      .from(projectStages)
      .where(and(eq(projectStages.projectId, stage.projectId), eq(projectStages.orderIndex, last.orderIndex + 1)))
      .limit(1);

    let next: typeof stage | null = null;
    let projectCompleted = false;
    if (nextRows.length > 0) {
      next = nextRows[0];
      await tx
        .update(projectStages)
        .set({
          status: "active",
          startedAt: now,
          updatedAt: now,
          // Yangi faol bosqiç → yana studiya navbati; oldingi tekşiruv ma'lumotlarini tozalaymiz.
          reviewStatus: "in_progress",
          reviewNote: null,
          reviewedByUserId: null,
          reviewedAt: null,
          submittedAt: null,
          submittedByUserId: null,
          reminderApproachingSentAt: null,
          reminderOverdueSentAt: null,
          reminderStaleSentAt: null,
        })
        .where(eq(projectStages.id, next.id));
    } else {
      projectCompleted = true;
      await tx
        .update(projects)
        .set({ status: "completed", completedAt: now, updatedAt: now })
        .where(eq(projects.id, stage.projectId));
    }

    return { stage, next, projectCompleted };
  });

  await recalcProjectProgress(result.stage.projectId);

  const [prj] = await db.select().from(projects).where(eq(projects.id, result.stage.projectId)).limit(1);

  await logActivity({
    userId: me.id,
    action: "stage.completed",
    entityType: "project_stage",
    entityId: stageId,
    newValue: { name: result.stage.name },
  });

  // Xabar: bosqiç yakunlandi → kurator + yaratuvçi.
  const completedRecipients = [prj?.curatorUserId, prj?.createdByUserId].filter(Boolean) as string[];
  if (completedRecipients.length > 0) {
    await notify({
      userIds: completedRecipients,
      type: "stage.completed",
      title: `${prj!.name}: ${result.stage.name}`,
      message: "Bosqich yakunlandi / Этап завершён",
      link: `/projects/${result.stage.projectId}/stages/${stageId}`,
      entityType: "project_stage",
      entityId: stageId,
    });
  }

  // Xabar: STUDIYAga uning bosqiç işi qabul qilingani haqida (endi qabul qilinişi
  // ular uçun körinmas bölib qolmaydi).
  const studioContactId = await resolveStudioContactId(result.stage.projectId);
  if (studioContactId) {
    await notify({
      userIds: [studioContactId],
      type: "stage.accepted",
      title: `${prj!.name}: ${result.stage.name}`,
      message: "Bosqich qabul qilindi / Этап принят",
      link: `/contractor/projects/${result.stage.projectId}/stages/${stageId}`,
      entityType: "project_stage",
      entityId: stageId,
    });
  }

  // Xabar: keyingi bosqiç boşlandi → uning mas'uli (+ kurator).
  if (result.next) {
    const startRecipients = [result.next.responsibleUserId, prj?.curatorUserId].filter(Boolean) as string[];
    if (startRecipients.length > 0) {
      await notify({
        userIds: startRecipients,
        type: "stage.started",
        title: `${prj!.name}: ${result.next.name}`,
        message: "Yangi bosqich boshlandi / Начат новый этап",
        link: `/projects/${result.stage.projectId}/stages/${result.next.id}`,
        entityType: "project_stage",
        entityId: result.next.id,
      });
    }
  }

  // Xabar: loyiha avtomatik yakunlandi → kurator + yaratuvçi + direktorlar.
  if (result.projectCompleted) {
    const recipients = new Set<string>([...completedRecipients, ...(await directorIds())]);
    await notify({
      userIds: Array.from(recipients),
      type: "project.completed",
      title: `${prj!.name}`,
      message: "Loyiha yakunlandi / Проект завершён",
      link: `/projects/${result.stage.projectId}`,
      entityType: "project",
      entityId: result.stage.projectId,
    });
  }

  stageLinks(result.stage.projectId, stageId);
  return { projectCompleted: result.projectCompleted, nextStageId: result.next?.id ?? null };
}

/**
 * Eng oxirgi yakunlangan bosqiçni qayta oçadi (faqat admin uçun).
 * Yagona orqaga qaytiş ötişi. "Aynan bitta faol, qat'iy ketma-ket" qoidasini
 * saqlaydi: bu bosqiçni yana faol qiladi va uning yakunlanişi bilan oçilgan
 * bosqiçni qaytadan qulflangan holatga tuşiradi.
 */
export async function reopenStage(stageId: string) {
  const me = await requireProjectEditor();

  const { projectId, startStageId } = await db.transaction(async (tx) => {
    const rows = await tx.select().from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
    if (rows.length === 0) throw new Error("not_found");
    const stage = rows[0];
    if (stage.status !== "completed") throw new Error("stage_not_completed");

    const all = await tx
      .select({ id: projectStages.id, orderIndex: projectStages.orderIndex, status: projectStages.status, mergeWithNext: projectStages.mergeWithNext })
      .from(projectStages)
      .where(eq(projectStages.projectId, stage.projectId))
      .orderBy(projectStages.orderIndex);

    // Faqat oxirgi yakunlangan bosqiçni qayta oçiş mumkin (joriy faol bosqiçdan bevosita oldingisi,
    // yoki yakunlangan loyihaning eng sönggi bosqiçi).
    const lastCompleted = [...all].reverse().find((s) => s.status === "completed");
    if (!lastCompleted || lastCompleted.id !== stageId) throw new Error("not_last_completed");

    const now = new Date();

    // Agar bu bosqiç birlaştirilgan blok tarkibida avtomatik yakunlangan bölsa (oldingi bosqiçga
    // mergeWithNext belgisi qöyilgan), BUTUN blokni bekor qilamiz: blok boşiga qaytib boramiz.
    let start = all.find((s) => s.orderIndex === stage.orderIndex)!;
    for (;;) {
      const prev = all.find((s) => s.orderIndex === start.orderIndex - 1);
      if (prev && prev.mergeWithNext) start = prev;
      else break;
    }

    // Blok boşi → yana faol; qayta oçiş xodimlar studiyadan qöşimça iş kutayotganini
    // anglatadi, şuning uçun navbat yana ularga ötadi (review_status → 'in_progress').
    await tx
      .update(projectStages)
      .set({ status: "active", completedAt: null, updatedAt: now, reviewStatus: "in_progress", submittedAt: null, submittedByUserId: null })
      .where(eq(projectStages.id, start.id));
    for (const s of all) {
      if (s.orderIndex > start.orderIndex && s.orderIndex <= stage.orderIndex) {
        await tx
          .update(projectStages)
          .set({ status: "locked", startedAt: null, completedAt: null, updatedAt: now })
          .where(eq(projectStages.id, s.id));
      }
    }

    // Blokdan keyingi bosqiçni (agar oçilgan bölsa) qaytadan qulflangan holatga tuşiramiz.
    const next = all.find((s) => s.orderIndex === stage.orderIndex + 1);
    if (next && next.status === "active") {
      await tx
        .update(projectStages)
        .set({ status: "locked", startedAt: null, updatedAt: now })
        .where(eq(projectStages.id, next.id));
    }

    // Agar loyiha avtomatik yakunlangan bölsa, uni yana faol holatga qaytaramiz.
    await tx
      .update(projects)
      .set({ status: "planning", completedAt: null, updatedAt: now })
      .where(and(eq(projects.id, stage.projectId), eq(projects.status, "completed")));

    return { projectId: stage.projectId, startStageId: start.id };
  });

  await recalcProjectProgress(projectId);
  await logActivity({ userId: me.id, action: "stage.reopened", entityType: "project_stage", entityId: stageId });

  // Studiyaga xabar beramiz — navbat yana ularga ötdi (acceptStage/requestStageChanges kabi).
  const studioContactId = await resolveStudioContactId(projectId);
  if (studioContactId) {
    const [prj] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1);
    await notify({
      userIds: [studioContactId],
      type: "stage.changes_requested",
      title: `${prj?.name}`,
      message: "Bosqich qayta ochildi — sizning navbatingiz / Этап переоткрыт",
      link: `/contractor/projects/${projectId}/stages/${startStageId}`,
      entityType: "project_stage",
      entityId: startStageId,
    });
  }

  stageLinks(projectId, stageId);
}

// ---------- tekşiruv yordamçi maşinasi (studiya ↔ xodim aylanmasi) ----------

/**
 * STUDIYA faol bosqiç işini BKRMga tekşiruvga topşiradi. Bu fayl yuklaşdan
 * alohida, ataylab qilinadigan amal (fayl yuklaş oddiy biriktiriş bölib qolaveradi).
 */
export async function submitStageWork(stageId: string) {
  const me = await requireUser();
  const [stage] = await db.select().from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!stage) throw new Error("not_found");
  if (stage.status !== "active") throw new Error("stage_not_active");
  if (stage.reviewStatus !== "in_progress" && stage.reviewStatus !== "changes_requested") throw new Error("already_submitted");

  // Kontragent faqat öz loyihasining bosqiçini topşira oladi.
  if (me.position === "kontragent") {
    const [prj] = await db.select({ ec: projects.externalCompanyId }).from(projects).where(eq(projects.id, stage.projectId)).limit(1);
    const owned = prj?.ec
      ? await db.select({ id: externalCompanies.id }).from(externalCompanies).where(and(eq(externalCompanies.id, prj.ec), eq(externalCompanies.contactEmail, me.email))).limit(1)
      : [];
    if (owned.length === 0) throw new Error("forbidden");
  }

  // Topşiriş uçun aqalli bir narsa bölişi kerak.
  const [cnt] = await db.select({ c: sql<number>`count(*)::int` }).from(stageDocuments).where(eq(stageDocuments.stageId, stageId));
  if (!cnt || cnt.c === 0) throw new Error("nothing_to_submit");

  const now = new Date();
  await db.update(projectStages).set({ reviewStatus: "submitted", submittedAt: now, submittedByUserId: me.id, updatedAt: now }).where(eq(projectStages.id, stageId));
  await logActivity({ userId: me.id, action: "stage.submitted", entityType: "project_stage", entityId: stageId, newValue: { name: stage.name } });

  // Kuratorlarga (bizning tomon) xabar beramiz — endi ularning navbati.
  const [prj] = await db.select({ name: projects.name, curatorUserId: projects.curatorUserId, ec: projects.externalCompanyId }).from(projects).where(eq(projects.id, stage.projectId)).limit(1);
  const recipients = new Set<string>();
  if (prj?.curatorUserId) recipients.add(prj.curatorUserId);
  try {
    const rows = await db.select({ userId: projectCurators.userId }).from(projectCurators).where(eq(projectCurators.projectId, stage.projectId));
    for (const r of rows) recipients.add(r.userId);
  } catch { /* projectCurators migratsiya qilinmagan */ }
  recipients.delete(me.id);
  if (recipients.size > 0) {
    await notify({
      userIds: [...recipients],
      type: "stage.submitted",
      title: `${prj?.name}: ${stage.name}`,
      message: "Studiya ishni ko'rib chiqishga yubordi / Студия отправила работу на проверку",
      // Studiyalar ish maydoniga ötadi (u yerda qabul qilish / o'zgartirish so'rash boshqaruvlari bor).
      link: prj?.ec ? `/contractors/${prj.ec}?review=${stage.projectId}` : `/projects/${stage.projectId}/stages/${stageId}`,
      entityType: "project_stage",
      entityId: stageId,
    });
  }
  stageLinks(stage.projectId, stageId);
}

/**
 * XODIM topşirilgan işni izoh bilan qaytaradi. Bosqiç 'active' bölib qoladi; faqat
 * tekşiruv yordamçi maşinasi özgaradi. Izoh tarix uçun bosqiç çatiga ham yozib qöyiladi.
 */
export async function requestStageChanges(stageId: string, note: string) {
  const me = await requireProjectEditor();
  const text = (note ?? "").trim();
  if (text.length < 2) throw new Error("note_required");
  const [stage] = await db.select().from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!stage) throw new Error("not_found");
  if (stage.status !== "active") throw new Error("stage_not_active");

  const now = new Date();
  await db.update(projectStages).set({ reviewStatus: "changes_requested", reviewNote: text, reviewedByUserId: me.id, reviewedAt: now, updatedAt: now }).where(eq(projectStages.id, stageId));
  // Söralgan özgartirişni suhbatda saqlab qolamiz.
  await db.insert(projectMessages).values({ projectId: stage.projectId, stageId, userId: me.id, content: text });
  await logActivity({ userId: me.id, action: "stage.changes_requested", entityType: "project_stage", entityId: stageId, newValue: { note: text } });

  const studioContactId = await resolveStudioContactId(stage.projectId);
  const [prj] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, stage.projectId)).limit(1);
  if (studioContactId) {
    await notify({
      userIds: [studioContactId],
      type: "stage.changes_requested",
      title: `${prj?.name}: ${stage.name}`,
      message: text.length > 120 ? `${text.slice(0, 117)}…` : text,
      link: `/contractor/projects/${stage.projectId}/stages/${stageId}`,
      entityType: "project_stage",
      entityId: stageId,
    });
  }
  stageLinks(stage.projectId, stageId);
}

/**
 * XODIM topşirilgan işni qabul qiladi → zanjir oldinga suriladi. completeStage
 * ustidagi yupqa örоvçi (u endi studiyaga qabul qilinişi haqida ham xabar beradi).
 */
export async function acceptStage(stageId: string) {
  return completeStage(stageId);
}

/** XODIM studiya bu bosqiçda nima topşirişi kerakligini belgilaydi (studiya uçun faqat öqiş). */
export async function setStageRequirements(stageId: string, requirements: string | null) {
  const me = await requireProjectEditor();
  const [row] = await db.select({ projectId: projectStages.projectId }).from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!row) throw new Error("not_found");
  await db.update(projectStages).set({ requirements: requirements?.trim() || null, updatedAt: new Date() }).where(eq(projectStages.id, stageId));
  await logActivity({ userId: me.id, action: "stage.requirements_set", entityType: "project_stage", entityId: stageId });
  stageLinks(row.projectId, stageId);
}

// ---------- maydon yangilagiçlar ----------

export async function setStageDeadline(stageId: string, date: string | null) {
  const me = await requireProjectEditor();
  const [row] = await db.select({ projectId: projectStages.projectId }).from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!row) throw new Error("not_found");
  await db
    .update(projectStages)
    .set({ plannedDeadline: date, updatedAt: new Date(), reminderApproachingSentAt: null, reminderOverdueSentAt: null })
    .where(eq(projectStages.id, stageId));
  await logActivity({ userId: me.id, action: "stage.deadline_changed", entityType: "project_stage", entityId: stageId, newValue: { plannedDeadline: date } });
  stageLinks(row.projectId, stageId);
}

// Bosqiçning asosiy maydonlarini (nom + boşlaniş/tugaş sanalari + byudjet) bitta
// "qalam" oynasidan bir yöla tahrirlaydi. Barça xodimlar uçun oçiq. Muddat eslatmalarini
// tozalaydi — özgargan muddat cron xabarnomalarini qaytadan işga tuşirsin.
const updateStageSchema = z.object({
  name: z.string().min(1).max(255),
  plannedStartDate: z.string().nullable().optional(),
  plannedDeadline: z.string().nullable().optional(),
  plannedAmount: z.number().nullable().optional(),
  contractNumber: z.string().max(50).optional(),
  responsibleUserId: z.string().uuid().nullable().optional(),
});
export async function updateStage(stageId: string, input: z.infer<typeof updateStageSchema>) {
  const me = await requireProjectEditor();
  const parsed = updateStageSchema.parse(input);
  const [row] = await db.select({ projectId: projectStages.projectId }).from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!row) throw new Error("not_found");
  await db
    .update(projectStages)
    .set({
      name: parsed.name.trim(),
      plannedStartDate: parsed.plannedStartDate || null,
      plannedDeadline: parsed.plannedDeadline || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      plannedAmount: parsed.plannedAmount != null ? (String(parsed.plannedAmount) as any) : null,
      ...(parsed.contractNumber !== undefined && { contractNumber: parsed.contractNumber.trim() || "1" }),
      ...(parsed.responsibleUserId !== undefined && { responsibleUserId: parsed.responsibleUserId }),
      updatedAt: new Date(),
      reminderApproachingSentAt: null,
      reminderOverdueSentAt: null,
    })
    .where(eq(projectStages.id, stageId));
  await logActivity({ userId: me.id, action: "stage.updated", entityType: "project_stage", entityId: stageId, newValue: { name: parsed.name } });
  stageLinks(row.projectId, stageId);
}

// ---------- hujjatlar ----------

async function stageProjectId(stageId: string): Promise<string> {
  const [row] = await db.select({ projectId: projectStages.projectId }).from(projectStages).where(eq(projectStages.id, stageId)).limit(1);
  if (!row) throw new Error("not_found");
  return row.projectId;
}

/** Foydalanuvçi kiritgan jild nomini me'yorlaydi: keraksiz boşliqlarni oladi, ortiqça boşliqlarni birlaştiradi, uzunligini çeklaydi; boş → null. */
function normalizeCategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.replace(/\s+/g, " ").trim().slice(0, 120);
  return v.length > 0 ? v : null;
}

// Hujjat qöşiş src/app/api/files/stage-docs/route.ts manzilidagi oqim yöli
// orqali amalga oşiriladi (yuklamalar Server Action xotirasida buferlanmasdan
// bevosita diskka oqib boradi — 2GB'lik işlab çiqariş serveri uçun xavfsiz).
// Quyidagi server amallari faqat mavjud qatorlarga tegadi, şu bois ular fayl tanasini olib yurmaydi.

/** Hujjatni boşqa jildga köçiradi (yoki jildini tozalaydi). Bosqiç sahifasidan sudramasdan qayta joylaşni ta'minlaydi. */
export async function setStageDocumentCategory(documentId: string, category: string | null) {
  const me = await requireProjectEditor();
  const [doc] = await db.select().from(stageDocuments).where(eq(stageDocuments.id, documentId)).limit(1);
  if (!doc) return;
  const projectId = await stageProjectId(doc.stageId);
  await db.update(stageDocuments).set({ category: normalizeCategory(category) }).where(eq(stageDocuments.id, documentId));
  await logActivity({ userId: me.id, action: "stage.document_recategorized", entityType: "project_stage", entityId: doc.stageId, newValue: { category: normalizeCategory(category) } });
  stageLinks(projectId, doc.stageId);
}

export async function removeStageDocument(documentId: string) {
  const me = await requireProjectEditor();
  const [doc] = await db.select().from(stageDocuments).where(eq(stageDocuments.id, documentId)).limit(1);
  if (!doc) return;
  const projectId = await stageProjectId(doc.stageId);
  await deleteFileByUrl(doc.fileUrl);
  await db.delete(stageDocuments).where(eq(stageDocuments.id, documentId));
  await logActivity({ userId: me.id, action: "stage.document_removed", entityType: "project_stage", entityId: doc.stageId });
  stageLinks(projectId, doc.stageId);
}

// ---------- tölovlar ----------

const paymentSchema = z.object({
  stageId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default("UZS"),
  note: z.string().max(500).nullable().optional(),
  status: z.enum(["pending", "paid"]).default("pending"),
});

export async function addStagePayment(input: z.infer<typeof paymentSchema>) {
  const me = await requireProjectEditor();
  const parsed = paymentSchema.parse(input);
  const projectId = await stageProjectId(parsed.stageId);
  await db.insert(stagePayments).values({
    stageId: parsed.stageId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    amount: parsed.amount as any,
    currency: parsed.currency,
    status: parsed.status,
    paidAt: parsed.status === "paid" ? new Date() : null,
    note: parsed.note ?? null,
    createdByUserId: me.id,
  });
  await logActivity({ userId: me.id, action: "stage.payment_added", entityType: "project_stage", entityId: parsed.stageId, newValue: { amount: parsed.amount, status: parsed.status } });
  stageLinks(projectId, parsed.stageId);
}

export async function setStagePaymentStatus(paymentId: string, status: "pending" | "paid") {
  const me = await requireProjectEditor();
  const [row] = await db.select().from(stagePayments).where(eq(stagePayments.id, paymentId)).limit(1);
  if (!row) return;
  const projectId = await stageProjectId(row.stageId);
  await db
    .update(stagePayments)
    .set({ status, paidAt: status === "paid" ? new Date() : null })
    .where(eq(stagePayments.id, paymentId));
  await logActivity({ userId: me.id, action: "stage.payment_status_changed", entityType: "project_stage", entityId: row.stageId, newValue: { status } });
  stageLinks(projectId, row.stageId);
}

export async function deleteStagePayment(paymentId: string) {
  const me = await requireProjectEditor();
  const [row] = await db.select().from(stagePayments).where(eq(stagePayments.id, paymentId)).limit(1);
  if (!row) return;
  const projectId = await stageProjectId(row.stageId);
  await db.delete(stagePayments).where(eq(stagePayments.id, paymentId));
  await logActivity({ userId: me.id, action: "stage.payment_deleted", entityType: "project_stage", entityId: row.stageId });
  stageLinks(projectId, row.stageId);
}
