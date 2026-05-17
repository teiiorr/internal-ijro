import { redirect } from "next/navigation";
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--background)]">
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Non-disclosure agreement</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>By accepting this NDA, you agree to keep all information, documents and communication shared via this portal strictly confidential.</p>
          <p>Violation may result in contract termination and legal consequences under the laws of the Republic of Uzbekistan.</p>
          <form action={accept}>
            <Button type="submit">I accept</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
