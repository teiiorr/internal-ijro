import { NextRequest, NextResponse } from "next/server";
import type ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { listProjectsForReport } from "@/server/queries/projects";
import { canViewMoney } from "@/lib/permissions/project-editors";
import { derivedStatus, type DerivedStatus } from "@/lib/projects/progress";

export const runtime = "nodejs";

const STATUS_PRIORITY: Record<DerivedStatus, number> = { in_progress: 0, not_started: 1, on_hold: 2, completed: 3 };

const HEADERS = [
  { header: "№", key: "no", width: 5 },
  { header: "Loyiha nomi", key: "name", width: 32 },
  { header: "Studiya nomi", key: "studio", width: 24 },
  { header: "Shartnoma raqami", key: "contract", width: 18 },
  { header: "Boshlanish sanasi", key: "start", width: 15 },
  { header: "Tugash sanasi", key: "end", width: 15 },
  { header: "Jami byudjet", key: "planned", width: 18 },
  { header: "Jami to'langan", key: "paid", width: 18 },
  { header: "Jami qoldiq", key: "remaining", width: 18 },
  { header: "Joriy bosqich", key: "stage", width: 24 },
  { header: "Joriy bosqich summasi", key: "stagePlanned", width: 20 },
  { header: "Joriy bosqich to'lovi", key: "stagePaid", width: 20 },
  { header: "Joriy bosqich qoldig'i", key: "stageRemaining", width: 20 },
];
const MONEY_COLS = ["planned", "paid", "remaining", "stagePlanned", "stagePaid", "stageRemaining"];

const GREEN_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD5F5E3" },
};
const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF2E86C1" },
};
const TOTAL_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF2F3F4" },
};

export async function GET(req: NextRequest) {
  const ExcelJS = (await import("exceljs")).default;
  const { applyMontserrat } = await import("@/lib/excel");

  const session = await auth();
  if (!session?.user) return new NextResponse("unauthorized", { status: 401 });
  if (!canViewMoney(session.user.email)) return new NextResponse("forbidden", { status: 403 });

  const sp = req.nextUrl.searchParams;
  const statusTab = sp.get("status") || "all";
  const raw = await listProjectsForReport({
    search: sp.get("search"),
    projectTypeId: sp.get("typeId"),
    stage: sp.get("stage"),
    payment: (sp.get("payment") as "paid" | "unpaid" | null) ?? null,
    overdue: sp.get("overdue") === "1",
  });

  const rows = raw
    .map((r) => {
      const derived = derivedStatus(r.progress, r.statusOverride);
      const atRisk = r.deadlineOverdue && derived !== "completed" && derived !== "on_hold";
      return { ...r, derived, atRisk };
    })
    .filter((r) => (statusTab === "all" ? true : statusTab === "at_risk" ? r.atRisk : r.derived === statusTab))
    .sort((a, b) => (a.atRisk !== b.atRisk ? (a.atRisk ? -1 : 1) : STATUS_PRIORITY[a.derived] - STATUS_PRIORITY[b.derived]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Markaz Ijro";
  wb.created = new Date();
  const ws = wb.addWorksheet("Excel hisoboti");
  ws.columns = HEADERS;

  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  for (let c = 1; c <= HEADERS.length; c++) {
    const cell = headerRow.getCell(c);
    cell.fill = HEADER_FILL;
    cell.font = { name: "Montserrat", bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }

  let grandPlanned = 0;
  let grandPaid = 0;
  let grandStagePlanned = 0;
  let grandStagePaid = 0;

  rows.forEach((r, i) => {
    const stageRem = Math.max(0, r.stagePlanned - r.stagePaid);
    const totalRem = Math.max(0, r.plannedTotal - r.paidTotal);
    grandPlanned += r.plannedTotal;
    grandPaid += r.paidTotal;
    grandStagePlanned += r.stagePlanned;
    grandStagePaid += r.stagePaid;

    const dataRow = ws.addRow({
      no: i + 1,
      name: r.name,
      studio: r.studioName ?? "",
      stage: r.activeStage ?? "",
      contract: r.contractNumber ?? "",
      start: r.startDate ?? "",
      end: r.deadline ?? "",
      planned: Math.round(r.plannedTotal),
      paid: Math.round(r.paidTotal),
      remaining: Math.round(totalRem),
      stagePlanned: Math.round(r.stagePlanned),
      stagePaid: Math.round(r.stagePaid),
      stageRemaining: Math.round(stageRem),
    });

    // Highlight the active stage cell green
    if (r.activeStage) {
      const stageCol = HEADERS.findIndex((h) => h.key === "stage") + 1;
      dataRow.getCell(stageCol).fill = GREEN_FILL;
      dataRow.getCell(stageCol).font = { name: "Montserrat", bold: true, color: { argb: "FF1E8449" }, size: 10 };
    }
  });

  // Grand totals row
  const totalRowNum = rows.length + 2;
  const totalRow = ws.addRow({
    no: "",
    name: "JAMI",
    studio: "",
    stage: "",
    contract: "",
    start: "",
    end: "",
    planned: Math.round(grandPlanned),
    paid: Math.round(grandPaid),
    remaining: Math.round(Math.max(0, grandPlanned - grandPaid)),
    stagePlanned: Math.round(grandStagePlanned),
    stagePaid: Math.round(grandStagePaid),
    stageRemaining: Math.round(Math.max(0, grandStagePlanned - grandStagePaid)),
  });
  for (let c = 1; c <= HEADERS.length; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = TOTAL_FILL;
    cell.font = { name: "Montserrat", bold: true, size: 10 };
  }

  // Number format + alignment for money columns
  for (const key of MONEY_COLS) {
    const col = ws.getColumn(key);
    col.numFmt = "#,##0";
    col.alignment = { horizontal: "right" };
  }
  ws.getColumn("no").alignment = { horizontal: "center" };
  ws.getColumn("start").alignment = { horizontal: "center" };
  ws.getColumn("end").alignment = { horizontal: "center" };

  // Thin borders across the used range
  const thin = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
  const lastRow = totalRowNum;
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
      "Content-Disposition": `attachment; filename="excel-hisoboti-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
