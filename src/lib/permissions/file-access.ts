import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, projectStages, externalCompanies, type Position } from "@/lib/db/schema";
import { isCompanyStudioOfProject } from "@/server/queries/studio";
import { can } from "@/lib/permissions/capabilities";

/**
 * Markazlashgan fayl-kirish avtorizatsiyasi (IDOR'ga qarshi).
 *
 * Yuklamalar `UPLOAD_DIR/<type>/<entityId>/<file>` ko'rinishida saqlanadi. Ilgari
 * faqat `employee-docs` obyekt bo'yicha tekshirilardi — qolgan hamma narsa (loyiha,
 * bosqich, chat, me'yoriy hujjatlar) har qanday tizimga kirgan foydalanuvchiga,
 * jumladan kontragentga ochiq edi. Bu guard har bir tur uchun kirishni cheklaydi.
 */

export type FileAccessUser = { id: string; email: string; position: Position };

/** Kontragent faqat o'z studiyasi biriktirilgan loyihaning fayllarini ko'ra oladi. */
async function contractorOwnsProject(user: FileAccessUser, projectId: string): Promise<boolean> {
  const [prj] = await db
    .select({ ec: projects.externalCompanyId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!prj) return false;
  const [company] = await db
    .select({ id: externalCompanies.id })
    .from(externalCompanies)
    .where(sql`lower(${externalCompanies.contactEmail}) = ${user.email.toLowerCase()}`)
    .limit(1);
  if (!company) return false;
  return isCompanyStudioOfProject(projectId, company.id, prj.ec);
}

/**
 * `segs` — yuklamalar ildiziga nisbatan normallashtirilgan yo'l segmentlari
 * (masalan ["project-docs", "<projectId>", "<file>"]). Kirishga ruxsat bo'lsa true.
 */
export async function canAccessFile(user: FileAccessUser, segs: string[]): Promise<boolean> {
  const type = (segs[0] ?? "").toLowerCase();
  const isContractor = user.position === "kontragent";

  // Past maxfiylikdagi ko'rsatuv aktivlari — har qanday tizimga kirgan foydalanuvchi.
  if (["avatars", "studio-logos", "contest-logos", "contest-photos", "contest-files"].includes(type)) {
    return true;
  }

  // Xodim hujjatlari (pasport, shartnoma) — faqat egasi yoki HR.
  if (type === "employee-docs") {
    const ownerId = (segs[1] ?? "").toLowerCase();
    return user.id.toLowerCase() === ownerId || can(user.position, "hr.documents");
  }

  // Me'yoriy hujjatlar — faqat ichki xodimlar (kontragent emas).
  if (type === "normative-docs") return !isContractor;

  // Ichki hujjatlar (bildirgilar, buyruqlar) — faqat ichki xodimlar; studiyalar hech qachon.
  if (type === "internal-docs") return !isContractor;

  // Loyihaga bog'liq: project-docs/<projectId>, chat/<projectId>.
  if (type === "project-docs" || type === "chat") {
    const projectId = segs[1];
    if (!projectId) return false;
    if (!isContractor) return true; // ichki xodimlar loyihalarni ko'radi
    return contractorOwnsProject(user, projectId);
  }

  // Bosqichga bog'liq: stage-docs/<stageId> → loyihaga yechamiz.
  if (type === "stage-docs") {
    const stageId = segs[1];
    if (!stageId) return false;
    if (!isContractor) return true;
    const [row] = await db
      .select({ projectId: projectStages.projectId })
      .from(projectStages)
      .where(eq(projectStages.id, stageId))
      .limit(1);
    if (!row) return false;
    return contractorOwnsProject(user, row.projectId);
  }

  // Noma'lum tur — ichki xodimga ruxsat, kontragentga yo'q (xavfsiz standart).
  return !isContractor;
}
