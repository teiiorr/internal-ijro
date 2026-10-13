import { NextRequest, NextResponse } from "next/server";
import type ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { isOwner } from "@/lib/permissions/owner";
import { canSeeMoney } from "@/lib/permissions/money";
import { canViewWeeklyBrief } from "@/lib/reports/weekly-brief-core";
import { MONEY_MASK } from "@/lib/permissions/project-editors";
import { getMinistryReport, parseMinistryPeriod } from "@/server/queries/ministry-report";

export const runtime = "nodejs";

const HEADER_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E86C1" } };
const TOTAL_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F3F4" } };
const THIN = { style: "thin" as const, color: { argb: "FFBFBFBF" } };

/** "YYYY-MM-DD" → Excel sana katagi (UTC yarim tun). */
function excelDay(iso: string): Date | null {
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

/**
 * Ministrlik hisobotining Excel eksporti. Davr ?from/&to yoki ?year dan olinadi.
 * Kirish /reports boʻlimi bilan bir xil (rahbarlar + egasi). Pul summalari faqat
 * money-ruxsatli foydalanuvchiga chiqadi — aks holda *** bilan maskalanadi.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  if (!canViewWeeklyBrief(session.user.position, isOwner(session.user.email))) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const ExcelJS = (await import("exceljs")).default;
  const { applyMontserrat } = await import("@/lib/excel");

  const sp = req.nextUrl.searchParams;
  const period = parseMinistryPeriod((k) => sp.get(k));
  const canMoney = await canSeeMoney({ id: session.user.id, email: session.user.email });
  // Eksport hujjati oʻzbek (lotin) tilida — boshqa eksportlar bilan bir xil.
  const report = await getMinistryReport(period.from, period.to, "uz-latn");
  const money = (n: number) => (canMoney ? Math.round(n) : MONEY_MASK);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Markaz Ijro";
  wb.created = new Date();

  const onTime = report.discipline.onTimePercent;

  // ---------- 1. Jamlanma ----------
  const wsS = wb.addWorksheet("Jamlanma");
  wsS.columns = [
    { header: "Koʻrsatkich", key: "metric", width: 42 },
    { header: "Qiymat", key: "value", width: 28 },
  ];
  styleHeader(wsS, 2);
  const summary: { metric: string; value: string | number | Date | null }[] = [
    { metric: "Davr boshlanishi", value: excelDay(report.period.from) },
    { metric: "Davr tugashi", value: excelDay(report.period.to) },
    { metric: "Ishlab chiqarilgan loyihalar (jami)", value: report.produced.total },
    { metric: "Ishlab chiqarishda (faol loyihalar)", value: report.inProduction },
    { metric: "Muddatida topshirish ulushi (%)", value: onTime == null ? "—" : onTime },
    { metric: "Muddati oʻtib yakunlangan bosqichlar", value: report.discipline.late },
    { metric: "Yakunlangan bosqichlar (jami)", value: report.discipline.completedStages },
    { metric: "Jalb qilingan studiyalar", value: report.studiosEngaged },
  ];
  for (const r of summary) wsS.addRow(r);
  wsS.getColumn("metric").alignment = { horizontal: "left" };
  wsS.getColumn("value").alignment = { horizontal: "left" };
  for (let r = 2; r <= 3; r++) wsS.getRow(r).getCell("value").numFmt = "dd.mm.yyyy";
  borders(wsS, 2);
  applyMontserrat(wsS);

  // ---------- 2. Tur boʻyicha ----------
  const wsT = wb.addWorksheet("Tur boʻyicha");
  wsT.columns = [
    { header: "№", key: "no", width: 5 },
    { header: "Ishlab chiqarish turi", key: "type", width: 40 },
    { header: "Soni", key: "count", width: 12 },
  ];
  styleHeader(wsT, 3);
  report.produced.byType.forEach((row, i) => {
    wsT.addRow({ no: i + 1, type: row.name, count: row.count });
  });
  const totalRow = wsT.addRow({ no: "", type: "JAMI", count: report.produced.total });
  for (let c = 1; c <= 3; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = TOTAL_FILL;
    cell.font = { name: "Montserrat", bold: true, size: 10 };
  }
  for (const key of ["no", "count"]) wsT.getColumn(key).alignment = { horizontal: "center" };
  borders(wsT, 3);
  applyMontserrat(wsT);

  // ---------- 3. Byudjet ----------
  const wsB = wb.addWorksheet("Byudjet");
  wsB.columns = [
    { header: "Valyuta", key: "currency", width: 12 },
    { header: "Rejadagi byudjet", key: "planned", width: 20 },
    { header: "Toʻlangan", key: "paid", width: 20 },
    { header: "Qoldiq", key: "remaining", width: 20 },
  ];
  styleHeader(wsB, 4);
  report.budget.forEach((row) => {
    wsB.addRow({
      currency: row.currency,
      planned: money(row.planned),
      paid: money(row.paid),
      remaining: money(row.remaining),
    });
  });
  if (canMoney) {
    for (const key of ["planned", "paid", "remaining"]) {
      const col = wsB.getColumn(key);
      col.numFmt = "#,##0";
      col.alignment = { horizontal: "right" };
    }
  }
  wsB.getColumn("currency").alignment = { horizontal: "center" };
  borders(wsB, 4);
  applyMontserrat(wsB);

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ministrlik-hisoboti-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
