import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { listProjectsForReport } from "@/server/queries/projects";
import { canViewMoney } from "@/lib/permissions/project-editors";
import { derivedStatus, type DerivedStatus } from "@/lib/projects/progress";
import { applyMontserrat } from "@/lib/excel";

export const runtime = "nodejs";

// In-progress first, completed last — matches the projects grid.
const STATUS_PRIORITY: Record<DerivedStatus, number> = { in_progress: 0, not_started: 1, on_hold: 2, completed: 3 };

// Report headers (Uzbek Latin, matching the printed "Loyihalar hisoboti").
const HEADERS = [
  { header: "№", key: "no", width: 5 },
  { header: "Loyiha nomi", key: "name", width: 30 },
  { header: "Ishlab chiqaruvchi studiya", key: "studio", width: 26 },
  { header: "Loyiha davri", key: "stage", width: 24 },
  { header: "Shartnoma raqami", key: "contract", width: 16 },
  { header: "Boshlash", key: "start", width: 13 },
  { header: "Tugatish", key: "end", width: 13 },
  { header: "Jami summa", key: "planned", width: 16 },
  { header: "To'lab berilgan", key: "paid", width: 16 },
  { header: "Qoldiq", key: "remaining", width: 16 },
];
const MONEY_COLS = ["planned", "paid", "remaining"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse("unauthorized", { status: 401 });
  // The report includes budgets/payments → money allowlist only.
  if (!canViewMoney(session.user.email)) return new NextResponse("forbidden", { status: 403 });

  // Honour the same filters as the projects list.
  const sp = req.nextUrl.searchParams;
  const statusTab = sp.get("status") || "all";
  const raw = await listProjectsForReport({
    search: sp.get("search"),
    projectTypeId: sp.get("typeId"),
    stage: sp.get("stage"),
    payment: (sp.get("payment") as "paid" | "unpaid" | null) ?? null,
    overdue: sp.get("overdue") === "1",
  });

  // Apply the derived-status tab filter + status-priority sort in JS.
  const rows = raw
    .map((r) => {
      const derived = derivedStatus(r.progress, r.statusOverride);
      const atRisk = r.deadlineOverdue && derived !== "completed" && derived !== "on_hold";
      return { ...r, derived, atRisk };
    })
    .filter((r) => (statusTab === "all" ? true : statusTab === "at_risk" ? r.atRisk : r.derived === statusTab))
    .sort((a, b) => STATUS_PRIORITY[a.derived] - STATUS_PRIORITY[b.derived]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Markaz Ijro";
  wb.created = new Date();
  const ws = wb.addWorksheet("Loyihalar hisoboti");
  ws.columns = HEADERS;

  rows.forEach((r, i) => {
    ws.addRow({
      no: i + 1,
      name: r.name,
      studio: r.studioName ?? "",
      stage: r.activeStage ?? "",
      contract: r.contractNumber ?? "",
      start: r.startDate ?? "",
      end: r.deadline ?? "",
      planned: Math.round(r.plannedTotal),
      paid: Math.round(r.paidTotal),
      remaining: Math.round(Math.max(0, r.plannedTotal - r.paidTotal)),
    });
  });

  // Number format + alignment for the money columns.
  for (const key of MONEY_COLS) {
    const col = ws.getColumn(key);
    col.numFmt = "#,##0";
    col.alignment = { horizontal: "right" };
  }
  ws.getColumn("no").alignment = { horizontal: "center" };
  ws.getColumn("start").alignment = { horizontal: "center" };
  ws.getColumn("end").alignment = { horizontal: "center" };
  ws.getRow(1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  // Thin borders across the used range (header + data) for the bordered table look.
  const thin = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
  const lastRow = rows.length + 1;
  for (let r = 1; r <= lastRow; r++) {
    for (let c = 1; c <= HEADERS.length; c++) {
      ws.getCell(r, c).border = { top: thin, left: thin, bottom: thin, right: thin };
    }
  }

  applyMontserrat(ws);

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="loyihalar-hisoboti-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
