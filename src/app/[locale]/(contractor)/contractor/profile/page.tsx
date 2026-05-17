import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ContractorProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const rows = await db.select().from(externalCompanies).where(eq(externalCompanies.contactEmail, session.user.email)).limit(1);
  const c = rows[0];
  if (!c) return <p>No company linked.</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Company profile</h1>
      <Card>
        <CardHeader><CardTitle>{c.name}</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div><span className="text-[var(--muted)]">Contact person:</span> {c.contactPerson ?? "—"}</div>
          <div><span className="text-[var(--muted)]">Email:</span> {c.contactEmail ?? "—"}</div>
          <div><span className="text-[var(--muted)]">Phone:</span> {c.contactPhone ?? "—"}</div>
          <div><span className="text-[var(--muted)]">Status:</span> {c.status}</div>
          <div><span className="text-[var(--muted)]">Rating:</span> {c.rating ?? "—"}</div>
          {c.specialization && <div><span className="text-[var(--muted)]">Specialization:</span> {c.specialization}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
