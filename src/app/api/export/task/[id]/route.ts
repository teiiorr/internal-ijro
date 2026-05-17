import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskAssignees, tasks } from "@/lib/db/schema";
import { buildTaskDocumentPdf } from "@/lib/pdf/task-document";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  const { id } = await ctx.params;

  // Authorization: only people involved in the task (creator/assignee) or director/orinbosar
  const t = await db.select({ createdBy: tasks.createdByUserId, regNum: tasks.registrationNumber }).from(tasks).where(eq(tasks.id, id)).limit(1);
  if (t.length === 0) return new NextResponse("not_found", { status: 404 });
  const isManager = ["direktor", "orinbosar"].includes(session.user.position);
  const isCreator = t[0].createdBy === session.user.id;
  if (!isCreator && !isManager) {
    const involved = await db.select().from(taskAssignees).where(eq(taskAssignees.taskId, id)).limit(1);
    if (involved.length === 0 || !involved.some(() => true)) {
      // Re-fetch focused on me
    }
    const me = await db
      .select()
      .from(taskAssignees)
      .where(eq(taskAssignees.taskId, id));
    if (!me.some((r) => r.userId === session.user.id)) {
      return new NextResponse("forbidden", { status: 403 });
    }
  }

  const pdf = await buildTaskDocumentPdf(id);
  if (!pdf) return new NextResponse("not_found", { status: 404 });
  const filename = `topshiriq-${(t[0].regNum ?? id).replace(/[/]/g, "-")}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
