import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ContractorProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const rows = await db.select().from(externalCompanies).where(eq(externalCompanies.contactEmail, session.user.email)).limit(1);
  const c = rows[0];
  if (!c) return <p>{t("contractor.profile.noCompany")}</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("contractor.profile.title")}</h1>
      <Card>
        <CardHeader><CardTitle>{c.name}</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div><span className="text-[var(--muted)]">{t("contractor.profile.contactPerson")}:</span> {c.contactPerson ?? "—"}</div>
          <div><span className="text-[var(--muted)]">{t("contractor.profile.email")}:</span> {c.contactEmail ?? "—"}</div>
          <div><span className="text-[var(--muted)]">{t("contractor.profile.phone")}:</span> {c.contactPhone ?? "—"}</div>
          <div><span className="text-[var(--muted)]">{t("contractor.profile.status")}:</span> {c.status}</div>
          <div><span className="text-[var(--muted)]">{t("contractor.profile.rating")}:</span> {c.rating ?? "—"}</div>
          {c.specialization && <div><span className="text-[var(--muted)]">{t("contractor.profile.specialization")}:</span> {c.specialization}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
