import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { listTasks } from "@/server/queries/tasks";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse("unauthorized", { status: 401 });
  const sp = req.nextUrl.searchParams;
  const rows = await listTasks({
    actorId: session.user.id,
    actorPosition: session.user.position,
    actorDepartmentId: session.user.departmentId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scope: ((sp.get("scope") as any) ?? "all"),
    search: sp.get("q"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: (sp.get("status") as any) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    priority: (sp.get("priority") as any) ?? null,
  });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Tasks");
  ws.columns = [
    { header: "Title", key: "title", width: 36 },
    { header: "Status", key: "status", width: 14 },
    { header: "Priority", key: "priority", width: 12 },
    { header: "Assignee", key: "assignedToName", width: 24 },
    { header: "Project", key: "projectName", width: 24 },
    { header: "Deadline", key: "deadline", width: 22 },
    { header: "Created", key: "createdAt", width: 22 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    ws.addRow({
      ...r,
      deadline: r.deadline ? new Date(r.deadline).toISOString() : "",
      createdAt: new Date(r.createdAt).toISOString(),
    });
  }
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tasks-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
