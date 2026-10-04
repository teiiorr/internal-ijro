import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/session";
import { allowedScopes, listControlExportRows } from "@/server/queries/task-control";
import { clampExportRange, resolveScope, tashkentDate } from "@/components/staff/task-control/control-logic";

export const runtime = "nodejs";

const STATUS_UZ: Record<string, string> = {
  todo: "Bajarilishi kerak",
  in_progress: "Bajarilmoqda",
  under_review: "Tekshiruvda",
  completed: "Bajarildi",
  rejected: "Rad etildi",
};

/** dd.mm.yyyy in Tashkent time. */
function ddmmyyyy(v: string | null): string {
  if (!v) return "";
  const [y, m, d] = tashkentDate(v).split("-");
  return `${d}.${m}.${y}`;
}

/** Ijro intizomi: one row per assignee of every in-scope task in the deadline range. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  if (session.user.position === "kontragent") return new NextResponse("forbidden", { status: 403 });

  const me: SessionUser = {
    id: session.user.id,
    email: session.user.email ?? "",
    fullName: session.user.fullName,
    position: session.user.position,
    departmentId: session.user.departmentId,
    status: session.user.status,
  };
  const sp = req.nextUrl.searchParams;
  const scope = resolveScope(sp.get("scope"), allowedScopes(me));
  const today = tashkentDate(new Date());
  const { from, to } = clampExportRange(sp.get("from"), sp.get("to"), today);
  const rows = await listControlExportRows(me, scope, from, to);

  const ExcelJS = (await import("exceljs")).default;
  const { applyMontserrat } = await import("@/lib/excel");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ichki Ijro";
  wb.created = new Date();
  const ws = wb.addWorksheet("Ijro nazorati");
  ws.columns = [
    { header: "Reg. №", key: "reg", width: 16 },
    { header: "Topshiriq", key: "title", width: 48 },
    { header: "Ijrochi", key: "assignee", width: 30 },
    { header: "Boʻlim", key: "department", width: 28 },
    { header: "Muddat", key: "deadline", width: 13 },
    { header: "Javob sanasi", key: "response", width: 14 },
    { header: "Holat", key: "status", width: 18 },
    { header: "Kechikish (kun)", key: "late", width: 16 },
    { header: "Eslatmalar soni", key: "nudges", width: 16 },
  ];
  for (const r of rows) {
    ws.addRow({
      reg: r.registrationNumber ?? "",
      title: r.title,
      assignee: r.assignee,
      department: r.department ?? "",
      deadline: ddmmyyyy(r.deadline),
      response: ddmmyyyy(r.responseSubmittedAt),
      status: STATUS_UZ[r.status] ?? r.status,
      late: r.lateDays ?? "",
      nudges: r.nudgeCount,
    });
  }
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.getColumn("title").alignment = { wrapText: true, vertical: "top" };
  applyMontserrat(ws);

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ijro-nazorati-${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
