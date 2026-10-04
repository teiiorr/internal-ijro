import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { departments, users } from "@/lib/db/schema";
import { employeeContactCards } from "@/lib/db/tables/staff-directory";
import { buildVCard, deptName, latinizeFileName } from "@/components/staff/staff-directory/logic";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Xodim kontaktini vCard 3.0 (.vcf) sifatida beradi — Android / iOS kontaktlariga import qilinadi. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  if (session.user.position === "kontragent") return new NextResponse("forbidden", { status: 403 });

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return new NextResponse("not_found", { status: 404 });

  const [u] = await db
    .select({
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      position: users.position,
      positionTitle: users.positionTitle,
      status: users.status,
      hidden: users.hidden,
      deptName: departments.name,
      deptLatn: departments.nameUzLatn,
    })
    .from(users)
    .leftJoin(departments, eq(departments.id, users.departmentId))
    .where(eq(users.id, id))
    .limit(1);
  if (!u || u.status !== "active" || u.hidden || u.position === "kontragent") {
    return new NextResponse("not_found", { status: 404 });
  }

  let card: { workPhone: string | null; internalExt: string | null; telegramUsername: string | null; showMobile: boolean } | null =
    null;
  try {
    const [c] = await db
      .select({
        workPhone: employeeContactCards.workPhone,
        internalExt: employeeContactCards.internalExt,
        telegramUsername: employeeContactCards.telegramUsername,
        showMobile: employeeContactCards.showMobile,
      })
      .from(employeeContactCards)
      .where(eq(employeeContactCards.userId, id))
      .limit(1);
    card = c ?? null;
  } catch {
    /* 0031 migratsiyasi hali qoʻllanmagan — faqat asosiy maydonlar */
  }

  const tp = await getTranslations({ locale: "uz-latn", namespace: "positions" });
  const body = buildVCard({
    fullName: u.fullName,
    org: "BKRM",
    department: u.deptName ? deptName({ name: u.deptName, nameUzLatn: u.deptLatn }, "uz-latn") : null,
    title: u.positionTitle ?? tp(u.position),
    email: u.email,
    workPhone: card?.workPhone ?? null,
    internalExt: card?.internalExt ?? null,
    mobile: card?.showMobile ? u.phone : null,
    telegramUsername: card?.telegramUsername ?? null,
  });

  const fileName = `${latinizeFileName(u.fullName)}.vcf`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
