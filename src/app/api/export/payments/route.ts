import { NextRequest, NextResponse } from "next/server";
import type ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { canSeeMoney } from "@/lib/permissions/money";
import {
  REGISTER_EXPORT_LIMIT,
  listPayables,
  listPaymentsRegisterForExport,
  parseRegisterFilters,
  type PayableRow,
} from "@/server/queries/finance";

export const runtime = "nodejs";

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

const HEADER_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E86C1" } };
const TOTAL_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F3F4" } };
const RED_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE2E2" } };
const THIN = { style: "thin" as const, color: { argb: "FFBFBFBF" } };

/** Toshkent kalendar sanasi → Excel sana katagi (UTC yarim tun, vaqtsiz). */
function tashkentDay(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const x = new Date(d.getTime() + TASHKENT_OFFSET_MS);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
}

function styleHeader(ws: ExcelJS.Worksheet, columns: number) {
  const row = ws.getRow(1);
  row.height = 28;
  for (let c = 1; c <= columns; c++) {
    const cell = row.getCell(c);
    cell.fill = HEADER_FILL;
    cell.font = { name: "Montserrat", bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function styleTotal(row: ExcelJS.Row, columns: number) {
  for (let c = 1; c <= columns; c++) {
    const cell = row.getCell(c);
    cell.fill = TOTAL_FILL;
    cell.font = { name: "Montserrat", bold: true, size: 10 };
  }
}

function borders(ws: ExcelJS.Worksheet, columns: number) {
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.hasValues) continue;
    for (let c = 1; c <= columns; c++) row.getCell(c).border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
  }
}

function sortCurrencies<T extends { currency: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => (a.currency === "UZS" ? -1 : b.currency === "UZS" ? 1 : a.currency.localeCompare(b.currency)));
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  if (session.user.position === "kontragent") return new NextResponse("forbidden", { status: 403 });
  if (!(await canSeeMoney({ id: session.user.id, email: session.user.email }))) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const ExcelJS = (await import("exceljs")).default;
  const { applyMontserrat } = await import("@/lib/excel");

  const sp = req.nextUrl.searchParams;
  const filters = parseRegisterFilters((k) => sp.get(k));
  const [register, payables] = await Promise.all([listPaymentsRegisterForExport(filters), listPayables()]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Markaz Ijro";
  wb.created = new Date();

  // ---------------- 1-varaq: Toʻlovlar ----------------
  const ws = wb.addWorksheet("Toʻlovlar");
  ws.columns = [
    { header: "Sana", key: "date", width: 13 },
    { header: "Loyiha", key: "project", width: 32 },
    { header: "Studiya", key: "studio", width: 24 },
    { header: "Bosqich", key: "stage", width: 26 },
    { header: "Shartnoma №", key: "contract", width: 14 },
    { header: "Summa", key: "amount", width: 18 },
    { header: "Valyuta", key: "currency", width: 10 },
    { header: "Holat", key: "status", width: 14 },
    { header: "Reja summasi", key: "planned", width: 18 },
    { header: "Izoh", key: "note", width: 32 },
    { header: "Kiritgan", key: "createdBy", width: 24 },
  ];
  const COLS1 = ws.columns.length;
  styleHeader(ws, COLS1);

  for (const r of register.rows) {
    ws.addRow({
      date: tashkentDay(r.paidAt ?? r.createdAt),
      project: r.projectName,
      studio: r.studioName ?? "",
      stage: r.stageName,
      contract: r.contractNumber ?? "",
      amount: r.amount,
      currency: r.currency,
      status: r.status === "paid" ? "Toʻlangan" : "Kutilmoqda",
      // Reja summasi loyiha valyutasida; toʻlov valyutasidan farq qilsa, valyuta yoniga yoziladi.
      planned:
        r.plannedAmount == null
          ? ""
          : r.projectCurrency === r.currency
            ? r.plannedAmount
            : `${r.plannedAmount.toLocaleString("ru-RU")} ${r.projectCurrency}`,
      note: r.note ?? "",
      createdBy: r.createdByName ?? "",
    });
  }

  // Valyuta boʻyicha jami (butun filtr boʻyicha — valyutalar aralashtirilmaydi)
  ws.addRow({});
  for (const tot of sortCurrencies(register.totals)) {
    styleTotal(ws.addRow({ project: `JAMI toʻlangan (${tot.currency})`, amount: tot.paid, currency: tot.currency, status: "Toʻlangan" }), COLS1);
    styleTotal(ws.addRow({ project: `JAMI kutilmoqda (${tot.currency})`, amount: tot.pending, currency: tot.currency, status: "Kutilmoqda" }), COLS1);
  }
  if (register.total > register.rows.length) {
    ws.addRow({ project: `Faqat birinchi ${REGISTER_EXPORT_LIMIT} ta qator eksport qilindi (jami ${register.total}).` });
  }

  ws.getColumn("date").numFmt = "dd.mm.yyyy";
  ws.getColumn("date").alignment = { horizontal: "center" };
  for (const key of ["amount", "planned"]) {
    const col = ws.getColumn(key);
    col.numFmt = "#,##0";
    col.alignment = { horizontal: "right" };
  }
  ws.getColumn("currency").alignment = { horizontal: "center" };
  ws.getColumn("contract").alignment = { horizontal: "center" };
  borders(ws, COLS1);
  applyMontserrat(ws);

  // ---------------- 2-varaq: Toʻlanishi kerak ----------------
  const ws2 = wb.addWorksheet("Toʻlanishi kerak");
  ws2.columns = [
    { header: "Turi", key: "kind", width: 22 },
    { header: "Loyiha", key: "project", width: 32 },
    { header: "Studiya", key: "studio", width: 24 },
    { header: "Bosqich", key: "stage", width: 26 },
    { header: "Reja summasi", key: "planned", width: 18 },
    { header: "Toʻlangan", key: "paid", width: 18 },
    { header: "Qoldiq", key: "remaining", width: 18 },
    { header: "Valyuta", key: "currency", width: 10 },
    { header: "Sana", key: "date", width: 13 },
    { header: "Kun", key: "days", width: 8 },
  ];
  const COLS2 = ws2.columns.length;
  styleHeader(ws2, COLS2);

  const addPayable = (r: PayableRow, kind: "accepted" | "upcoming") => {
    const days = kind === "accepted" ? r.daysSinceCompleted : r.daysSinceSubmitted;
    const row = ws2.addRow({
      kind: kind === "accepted" ? "Qabul qilingan, toʻlanmagan" : "Kutilayotgan majburiyat",
      project: r.projectName,
      studio: r.studioName ?? "",
      stage: r.stageName,
      planned: r.planned,
      paid: r.paid,
      remaining: r.remaining,
      currency: r.currency,
      date: tashkentDay(kind === "accepted" ? r.completedAt : r.submittedAt),
      days: days ?? "",
    });
    // 30 kundan oshgan qabul qilingan qarzdorlik — qizil
    if (kind === "accepted" && days != null && days > 30) {
      for (let c = 1; c <= COLS2; c++) row.getCell(c).fill = RED_FILL;
    }
  };
  payables.accepted.forEach((r) => addPayable(r, "accepted"));
  payables.upcoming.forEach((r) => addPayable(r, "upcoming"));

  const payTotals = new Map<string, { currency: string; planned: number; paid: number; remaining: number }>();
  for (const r of [...payables.accepted, ...payables.upcoming]) {
    const cur = payTotals.get(r.currency) ?? { currency: r.currency, planned: 0, paid: 0, remaining: 0 };
    cur.planned += r.planned;
    cur.paid += r.paid;
    cur.remaining += r.remaining;
    payTotals.set(r.currency, cur);
  }
  ws2.addRow({});
  for (const tot of sortCurrencies([...payTotals.values()])) {
    styleTotal(
      ws2.addRow({
        kind: `JAMI (${tot.currency})`,
        planned: tot.planned,
        paid: tot.paid,
        remaining: tot.remaining,
        currency: tot.currency,
      }),
      COLS2,
    );
  }

  for (const key of ["planned", "paid", "remaining"]) {
    const col = ws2.getColumn(key);
    col.numFmt = "#,##0";
    col.alignment = { horizontal: "right" };
  }
  ws2.getColumn("date").numFmt = "dd.mm.yyyy";
  ws2.getColumn("date").alignment = { horizontal: "center" };
  ws2.getColumn("days").alignment = { horizontal: "center" };
  ws2.getColumn("currency").alignment = { horizontal: "center" };
  borders(ws2, COLS2);
  applyMontserrat(ws2);

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tolovlar-reestri-${new Date(Date.now() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
