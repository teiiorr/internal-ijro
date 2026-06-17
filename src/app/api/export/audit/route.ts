import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { listAudit } from "@/server/queries/audit";
import { applyMontserrat } from "@/lib/excel";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse("unauthorized", { status: 401 });
  if (!["direktor", "orinbosar", "hr"].includes(session.user.position)) return new NextResponse("forbidden", { status: 403 });

  const sp = req.nextUrl.searchParams;
  const rows = await listAudit({
    userId: sp.get("userId"),
    action: sp.get("action"),
    entityType: sp.get("entityType"),
    from: sp.get("from"),
    to: sp.get("to"),
    search: sp.get("q"),
    scope: session.user.position === "hr" ? "hr" : "all",
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Audit");
  ws.columns = [
    { header: "Time", key: "createdAt", width: 22 },
    { header: "User", key: "userName", width: 28 },
    { header: "Action", key: "action", width: 28 },
    { header: "Entity type", key: "entityType", width: 18 },
    { header: "Entity id", key: "entityId", width: 36 },
    { header: "IP", key: "ipAddress", width: 16 },
  ];
  for (const r of rows) {
    ws.addRow({
      ...r,
      createdAt: new Date(r.createdAt).toISOString(),
    });
  }
  applyMontserrat(ws);
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
