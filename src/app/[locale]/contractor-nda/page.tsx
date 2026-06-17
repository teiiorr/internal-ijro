import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies } from "@/lib/db/schema";
import { acceptNda } from "@/server/actions/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function NdaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  if (session.user.position !== "kontragent") redirect("/dashboard");
  const c = await db.select().from(externalCompanies).where(eq(externalCompanies.contactEmail, session.user.email)).limit(1);
  if (c.length === 0) redirect("/login");
  if (c[0].ndaAcceptedAt) redirect("/contractor/dashboard");

  async function accept() {
    "use server";
    await acceptNda();
    redirect("/contractor/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader className="px-7 pt-8">
          <CardTitle className="font-display text-2xl tracking-tight">{t("contractor.nda.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-7 pb-8 text-base leading-relaxed">
          <p>{t("contractor.nda.description1")}</p>
          <p>{t("contractor.nda.description2")}</p>
          <form action={accept} className="pt-2">
            <Button type="submit" size="lg" className="w-full sm:w-auto">{t("contractor.nda.acceptBtn")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
