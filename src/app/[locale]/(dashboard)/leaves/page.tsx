import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaves, users } from "@/lib/db/schema";
import { LeavesPageClient } from "@/components/leaves/leaves-page-client";

export default async function LeavesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = session.user;
  const canManage = ["direktor", "orinbosar", "hr"].includes(me.position);

  const [my, pending] = await Promise.all([
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
  ]);

  return (
    <LeavesPageClient
      myLeaves={my as unknown as Parameters<typeof LeavesPageClient>[0]["myLeaves"]}
      pendingForReview={pending as unknown as Parameters<typeof LeavesPageClient>[0]["pendingForReview"]}
      canManage={canManage}
    />
  );
}
