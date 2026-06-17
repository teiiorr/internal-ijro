import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { listProjects } from "@/server/queries/projects";
import { applyMontserrat } from "@/lib/excel";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse("unauthorized", { status: 401 });
  const sp = req.nextUrl.searchParams;
  const rows = await listProjects({
    search: sp.get("q"),
    status: sp.get("status"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: (sp.get("type") as any) ?? null,
  });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Projects");
  ws.columns = [
    { header: "Name", key: "name", width: 36 },
    { header: "Type", key: "type", width: 10 },
    { header: "Status", key: "status", width: 14 },
    { header: "Progress %", key: "progressPercentage", width: 12 },
    { header: "Curator", key: "curatorName", width: 22 },
    { header: "Contractor", key: "companyName", width: 22 },
    { header: "Deadline", key: "deadline", width: 14 },
  ];
  for (const r of rows) ws.addRow(r);
  applyMontserrat(ws);
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="projects-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
