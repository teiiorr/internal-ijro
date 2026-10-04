import { NextRequest, NextResponse } from "next/server";
import type ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { isOwner } from "@/lib/permissions/owner";
import { canViewSlippage, isUnrealisticNorm, parseSlippageFilters, sharePercent } from "@/lib/projects/slippage";
import { getSlippageReport } from "@/server/queries/slippage";

export const runtime = "nodejs";

const HEADER_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E86C1" } };
const RED_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE2E2" } };
const AMBER_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1D6" } };
const GREEN_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD5F5E3" } };
const THIN = { style: "thin" as const, color: { argb: "FFBFBFBF" } };

/** "YYYY-MM-DD" → Excel sana katagi (UTC yarim tun). */
function excelDay(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function styleHeader(ws: ExcelJS.Worksheet, columns: number) {
  const row = ws.getRow(1);
  row.height = 30;
  for (let c = 1; c <= columns; c++) {
    const cell = row.getCell(c);
    cell.fill = HEADER_FILL;
    cell.font = { name: "Montserrat", bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function borders(ws: ExcelJS.Worksheet, columns: number) {
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= columns; c++) row.getCell(c).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  if (!canViewSlippage(session.user.position, isOwner(session.user.email))) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const ExcelJS = (await import("exceljs")).default;
  const { applyMontserrat } = await import("@/lib/excel");

  const sp = req.nextUrl.searchParams;
  const filters = parseSlippageFilters((k) => sp.get(k));
  // Eksport hujjati oʻzbek (lotin) tilida — boshqa eksportlar bilan bir xil.
  const report = await getSlippageReport(filters, "uz-latn");

  const wb = new ExcelJS.Workbook();
  wb.creator = "Markaz Ijro";
  wb.created = new Date();

  // ---------- 1. Loyihalar ----------
  const wsP = wb.addWorksheet("Loyihalar");
  wsP.columns = [
    { header: "№", key: "no", width: 5 },
    { header: "Loyiha", key: "project", width: 36 },
    { header: "Studiya", key: "studio", width: 26 },
    { header: "Turi", key: "type", width: 24 },
    { header: "Dastlabki tugash sanasi", key: "baseline", width: 16 },
    { header: "Joriy tugash sanasi", key: "current", width: 16 },
    { header: "Surilish (kun)", key: "slip", width: 12 },
    { header: "Koʻchirishlar soni", key: "reschedules", width: 14 },
    { header: "Studiya soʻrovlari ulushi (%)", key: "share", width: 16 },
  ];
  styleHeader(wsP, 9);
  report.projects.forEach((r, i) => {
    const row = wsP.addRow({
      no: i + 1,
      project: r.projectName,
      studio: r.studioName ?? "",
      type: r.typeName ?? "",
      baseline: excelDay(r.baselineEnd),
      current: excelDay(r.currentEnd),
      slip: r.slipDays,
      reschedules: r.reschedules,
      share: sharePercent(r.studioShare),
    });
    const slipCell = row.getCell("slip");
    if (r.slipDays != null) {
      slipCell.fill = r.slipDays > 14 ? RED_FILL : r.slipDays > 0 ? AMBER_FILL : GREEN_FILL;
      slipCell.font = { name: "Montserrat", bold: true, size: 10 };
    }
  });
  for (const key of ["baseline", "current"]) {
    const col = wsP.getColumn(key);
    col.numFmt = "dd.mm.yyyy";
    col.alignment = { horizontal: "center" };
  }
  for (const key of ["no", "slip", "reschedules", "share"]) wsP.getColumn(key).alignment = { horizontal: "center" };
  borders(wsP, 9);
  applyMontserrat(wsP);

  // ---------- 2. Studiyalar ----------
  const wsS = wb.addWorksheet("Studiyalar");
  wsS.columns = [
    { header: "№", key: "no", width: 5 },
    { header: "Studiya", key: "studio", width: 32 },
    { header: "Bosqichga oʻrtacha surilish (kun)", key: "avg", width: 18 },
    { header: "Koʻchirishlar soni", key: "reschedules", width: 14 },
    { header: "Uzaytirish tasdiqlangan", key: "approved", width: 16 },
    { header: "Uzaytirish rad etilgan", key: "rejected", width: 16 },
  ];
  styleHeader(wsS, 6);
  report.studios.forEach((r, i) => {
    wsS.addRow({
      no: i + 1,
      studio: r.studioName,
      avg: r.avgSlipPerStage,
      reschedules: r.reschedules,
      approved: r.extApproved,
      rejected: r.extRejected,
    });
  });
  wsS.getColumn("avg").numFmt = "0.0";
  for (const key of ["no", "avg", "reschedules", "approved", "rejected"]) wsS.getColumn(key).alignment = { horizontal: "center" };
  borders(wsS, 6);
  applyMontserrat(wsS);

  // ---------- 3. Meʼyorlar ----------
  const wsB = wb.addWorksheet("Meʼyorlar");
  wsB.columns = [
    { header: "№", key: "no", width: 5 },
    { header: "Bosqich", key: "stage", width: 36 },
    { header: "Turi", key: "type", width: 30 },
    { header: "Meʼyor (kun)", key: "norm", width: 12 },
    { header: "Mediana", key: "median", width: 12 },
    { header: "P80", key: "p80", width: 12 },
    { header: "Namuna (n)", key: "n", width: 12 },
  ];
  styleHeader(wsB, 7);
  report.benchmarks.forEach((r, i) => {
    const row = wsB.addRow({
      no: i + 1,
      stage: r.stageName,
      type: r.typeName,
      norm: r.defaultDays,
      median: r.median,
      p80: r.p80,
      n: r.n,
    });
    if (isUnrealisticNorm(r.median, r.defaultDays)) {
      const cell = row.getCell("norm");
      cell.fill = RED_FILL;
      cell.font = { name: "Montserrat", bold: true, color: { argb: "FFC0392B" }, size: 10 };
      cell.note = "Meʼyor haqiqatdan past (mediana > meʼyor × 1.25)";
    }
  });
  for (const key of ["median", "p80"]) wsB.getColumn(key).numFmt = "0.0";
  for (const key of ["no", "norm", "median", "p80", "n"]) wsB.getColumn(key).alignment = { horizontal: "center" };
  borders(wsB, 7);
  applyMontserrat(wsB);

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="muddat-surilishi-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
