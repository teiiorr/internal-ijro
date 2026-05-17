"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  users,
  employeeProfiles,
  employeeDocuments,
  positionHistory,
  POSITIONS,
} from "@/lib/db/schema";
import { requirePosition } from "@/lib/session";
import { createInvitation } from "@/server/actions/auth-flow";
import { logActivity } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { storeFile, deleteFileByUrl } from "@/lib/upload";

const internalPositions = POSITIONS.filter((p) => p !== "kontragent");

// --- Invite new employee ---
const inviteEmployeeSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(255),
  position: z.enum(internalPositions as [string, ...string[]]),
  departmentId: z.string().uuid().nullable().optional(),
  reportsToUserId: z.string().uuid().nullable().optional(),
  locale: z.string().default("ru"),
});

export async function inviteEmployee(formData: FormData) {
  const me = await requirePosition(["direktor", "orinbosar", "hr"]);
  if (!can(me.position, "employees.create")) throw new Error("forbidden");

  const parsed = inviteEmployeeSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase(),
    fullName: formData.get("fullName"),
    position: formData.get("position"),
    departmentId: formData.get("departmentId") || null,
    reportsToUserId: formData.get("reportsToUserId") || null,
    locale: formData.get("locale") ?? "ru",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "invalid");

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (existing.length > 0) throw new Error("email_taken");

  await createInvitation({
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    position: parsed.data.position as Exclude<(typeof POSITIONS)[number], "kontragent">,
    departmentId: parsed.data.departmentId ?? null,
    reportsToUserId: parsed.data.reportsToUserId ?? null,
    locale: parsed.data.locale,
    invitedByUserId: me.id,
  });

  await logActivity({
    userId: me.id,
    action: "employee.invited",
    entityType: "user",
    newValue: { email: parsed.data.email, position: parsed.data.position },
  });
  revalidatePath("/employees");
}

// --- Change position / department ---
const changePositionSchema = z.object({
  userId: z.string().uuid(),
  newPosition: z.enum(internalPositions as [string, ...string[]]),
  newDepartmentId: z.string().uuid().nullable().optional(),
  reportsToUserId: z.string().uuid().nullable().optional(),
  reason: z.string().max(500).optional(),
});

export async function changePosition(input: z.infer<typeof changePositionSchema>) {
  const me = await requirePosition(["direktor", "orinbosar"]);
  if (!can(me.position, "users.assign_position")) throw new Error("forbidden");

  const parsed = changePositionSchema.parse(input);
  const existing = await db.select().from(users).where(eq(users.id, parsed.userId)).limit(1);
  if (existing.length === 0) throw new Error("not_found");
  const u = existing[0];

  await db.transaction(async (tx) => {
    await tx.insert(positionHistory).values({
      userId: u.id,
      oldPosition: u.position,
      newPosition: parsed.newPosition,
      oldDepartmentId: u.departmentId,
      newDepartmentId: parsed.newDepartmentId ?? null,
      changedByUserId: me.id,
      reason: parsed.reason ?? null,
    });
    await tx
      .update(users)
      .set({
        position: parsed.newPosition as (typeof POSITIONS)[number],
        departmentId: parsed.newDepartmentId ?? null,
        reportsToUserId: parsed.reportsToUserId ?? u.reportsToUserId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, u.id));
  });

  await logActivity({
    userId: me.id,
    action: "employee.position_changed",
    entityType: "user",
    entityId: u.id,
    oldValue: { position: u.position, departmentId: u.departmentId },
    newValue: { position: parsed.newPosition, departmentId: parsed.newDepartmentId },
  });
  revalidatePath(`/employees/${u.id}`);
  revalidatePath("/employees");
}

// --- Archive / Restore employee ---
export async function archiveEmployee(userId: string, terminationDate: string) {
  const me = await requirePosition(["direktor", "orinbosar", "hr"]);
  if (!can(me.position, "employees.archive")) throw new Error("forbidden");
  await db
    .update(users)
    .set({ status: "archived", terminationDate, updatedAt: new Date() })
    .where(eq(users.id, userId));
  await logActivity({ userId: me.id, action: "employee.archived", entityType: "user", entityId: userId });
  revalidatePath(`/employees/${userId}`);
  revalidatePath("/employees");
}

export async function restoreEmployee(userId: string) {
  const me = await requirePosition(["direktor", "orinbosar", "hr"]);
  await db
    .update(users)
    .set({ status: "active", terminationDate: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
  await logActivity({ userId: me.id, action: "employee.restored", entityType: "user", entityId: userId });
  revalidatePath(`/employees/${userId}`);
  revalidatePath("/employees");
}

// --- Update HR profile (passport, INN, address, emergency contact, etc.) ---
const profileSchema = z.object({
  userId: z.string().uuid(),
  birthDate: z.string().nullable().optional(),
  passportSerial: z.string().max(20).nullable().optional(),
  passportNumber: z.string().max(20).nullable().optional(),
  passportIssuedBy: z.string().nullable().optional(),
  passportIssuedDate: z.string().nullable().optional(),
  inn: z.string().max(20).nullable().optional(),
  address: z.string().nullable().optional(),
  emergencyContactName: z.string().max(255).nullable().optional(),
  emergencyContactPhone: z.string().max(50).nullable().optional(),
  emergencyContactRelation: z.string().max(100).nullable().optional(),
  maritalStatus: z.string().max(20).nullable().optional(),
  education: z.string().nullable().optional(),
  notesHr: z.string().nullable().optional(),
});

export async function upsertEmployeeProfile(input: z.infer<typeof profileSchema>) {
  const me = await requirePosition(["direktor", "orinbosar", "hr"]);
  const parsed = profileSchema.parse(input);
  const values = { ...parsed, updatedAt: new Date() };
  const existing = await db
    .select({ userId: employeeProfiles.userId })
    .from(employeeProfiles)
    .where(eq(employeeProfiles.userId, parsed.userId))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(employeeProfiles).values(values);
  } else {
    await db.update(employeeProfiles).set(values).where(eq(employeeProfiles.userId, parsed.userId));
  }
  await logActivity({
    userId: me.id,
    action: "employee.profile_updated",
    entityType: "user",
    entityId: parsed.userId,
  });
  revalidatePath(`/employees/${parsed.userId}`);
}

// --- Upload employee document ---
export async function uploadEmployeeDocument(userId: string, documentType: string, title: string, file: File) {
  const me = await requirePosition(["direktor", "orinbosar", "hr"]);
  if (!can(me.position, "hr.documents")) throw new Error("forbidden");
  const stored = await storeFile(file, `employee-docs/${userId}`);
  const inserted = await db
    .insert(employeeDocuments)
    .values({
      userId,
      documentType,
      title,
      fileUrl: stored.url,
      fileSize: stored.size,
      fileMimeType: stored.mimeType,
      uploadedByUserId: me.id,
    })
    .returning({ id: employeeDocuments.id });
  await logActivity({
    userId: me.id,
    action: "employee.document_uploaded",
    entityType: "employee_document",
    entityId: inserted[0].id,
    newValue: { documentType, title, fileName: stored.originalName },
  });
  revalidatePath(`/employees/${userId}`);
  return { ok: true, id: inserted[0].id, url: stored.url };
}

export async function deleteEmployeeDocument(documentId: string) {
  const me = await requirePosition(["direktor", "orinbosar", "hr"]);
  const row = await db.select().from(employeeDocuments).where(eq(employeeDocuments.id, documentId)).limit(1);
  if (row.length === 0) return;
  await deleteFileByUrl(row[0].fileUrl);
  await db.delete(employeeDocuments).where(eq(employeeDocuments.id, documentId));
  await logActivity({
    userId: me.id,
    action: "employee.document_deleted",
    entityType: "employee_document",
    entityId: documentId,
  });
  revalidatePath(`/employees/${row[0].userId}`);
}

// --- Re-send invitation (for pending users) ---
// Implemented in auth-flow.createInvitation re-used.
export const _internal_marker = true as const;
void _internal_marker;
void and;
