import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaves, users } from "@/lib/db/schema";
import { LeavesPageClient } from "@/components/leaves/leaves-page-client";
import { LeavesCalendar } from "@/components/leaves/leaves-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LeavesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = session.user;
  const canManage = ["direktor", "orinbosar", "hr"].includes(me.position);

  const [my, pending, currentMonth] = await Promise.all([
    db.select().from(leaves).where(eq(leaves.userId, me.id)).orderBy(desc(leaves.createdAt)),
    canManage
      ? db
          .select({
            id: leaves.id,
            type: leaves.type,
            startDate: leaves.startDate,
            endDate: leaves.endDate,
            status: leaves.status,
            reason: leaves.reason,
            rejectionReason: leaves.rejectionReason,
            userName: users.fullName,
          })
          .from(leaves)
          .innerJoin(users, eq(users.id, leaves.userId))
          .where(eq(leaves.status, "pending"))
          .orderBy(desc(leaves.createdAt))
      : Promise.resolve([]),
    canManage
      ? db
          .select({
            id: leaves.id,
            startDate: leaves.startDate,
            endDate: leaves.endDate,
            type: leaves.type,
            status: leaves.status,
            userName: users.fullName,
          })
          .from(leaves)
          .innerJoin(users, eq(users.id, leaves.userId))
          .where(sql`${leaves.endDate} >= date_trunc('month', now())::date - interval '1 month' AND ${leaves.startDate} <= date_trunc('month', now())::date + interval '2 month'`)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      {canManage && currentMonth.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Leaves calendar</CardTitle></CardHeader>
          <CardContent>
            <LeavesCalendar items={currentMonth as Parameters<typeof LeavesCalendar>[0]["items"]} />
          </CardContent>
        </Card>
      )}
      <LeavesPageClient
        myLeaves={my as unknown as Parameters<typeof LeavesPageClient>[0]["myLeaves"]}
        pendingForReview={pending as unknown as Parameters<typeof LeavesPageClient>[0]["pendingForReview"]}
        canManage={canManage}
      />
    </div>
  );
}
