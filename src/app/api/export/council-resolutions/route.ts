import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listAllResolutions } from "@/server/queries/council-resolutions";
import {
  COUNCIL_KIND_LABEL_UZ,
  EFFECTIVE_STATUS_LABEL_UZ,
  ddmmyyyy,
  isCouncilKind,
  isStaffPosition,
  parseResolutionFilters,
  tashkentDateOf,
  tashkentToday,
} from "@/lib/councils/resolution-status";

export const runtime = "nodejs";

/** Kengash qarorlari ijrosi → XLSX. Same STAFF guard and filters as /kengashlar/ijro. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  if (!isStaffPosition(session.user.position)) return new NextResponse("forbidden", { status: 403 });

  const sp = req.nextUrl.searchParams;
  const filters = parseResolutionFilters((k) => sp.get(k), session.user.position);
  const { rows } = await listAllResolutions({ id: session.user.id }, filters);

  const ExcelJS = (await import("exceljs")).default;
  const { applyMontserrat } = await import("@/lib/excel");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ichki Ijro";
  wb.created = new Date();
  const ws = wb.addWorksheet("Kengash qarorlari");
  ws.columns = [
    { header: "Kengash", key: "kind", width: 22 },
    { header: "Majlis sanasi", key: "meetingDate", width: 14 },
    { header: "№", key: "number", width: 6 },
    { header: "Qaror matni", key: "text", width: 60 },
    { header: "Masʼul", key: "responsible", width: 30 },
    { header: "Boʻlim", key: "department", width: 28 },
    { header: "Muddat", key: "due", width: 13 },
    { header: "Holat", key: "status", width: 18 },
    { header: "Topshiriq №", key: "task", width: 18 },
    { header: "Yopilish izohi", key: "note", width: 40 },
  ];
  for (const r of rows) {
    ws.addRow({
      kind: isCouncilKind(r.meetingKind) ? COUNCIL_KIND_LABEL_UZ[r.meetingKind] : r.meetingKind,
      meetingDate: ddmmyyyy(tashkentDateOf(r.meetingDate)),
      number: r.number,
      text: r.text,
      responsible: r.responsibleName ?? "",
      department: r.departmentName ?? "",
      due: ddmmyyyy(r.dueDate),
      status: EFFECTIVE_STATUS_LABEL_UZ[r.effective],
      task: r.taskRegNumber ?? "",
      note: r.closedNote ?? "",
    });
  }
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.getColumn("text").alignment = { wrapText: true, vertical: "top" };
  ws.getColumn("note").alignment = { wrapText: true, vertical: "top" };
  applyMontserrat(ws);

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="kengash-qarorlari-${tashkentToday()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
