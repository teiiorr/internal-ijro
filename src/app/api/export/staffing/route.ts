import { NextResponse } from "next/server";
import type ExcelJS from "exceljs";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import type { Position } from "@/lib/db/schema";
import { getOrgTree, listDirectory, type PersonLite, type PersonRow } from "@/server/queries/directory";
import { flattenTree, tashkentToday } from "@/components/staff/staff-directory/logic";

export const runtime = "nodejs";

const ALLOWED: Position[] = ["direktor", "orinbosar", "hr"];

const COLUMNS: Array<Partial<ExcelJS.Column>> = [
  { header: "Boʻlim", key: "dept", width: 30 },
  { header: "Lavozim", key: "position", width: 28 },
  { header: "F.I.Sh.", key: "name", width: 34 },
  { header: "Email", key: "email", width: 30 },
  { header: "Ish telefoni", key: "workPhone", width: 18 },
  { header: "Ichki raqam", key: "ext", width: 12 },
  { header: "Xona", key: "room", width: 10 },
  { header: "Rahbar", key: "manager", width: 30 },
];

const HEADER_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
const GROUP_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F2F8" } };
const RED = "FFDC2626";

/** Shtat jadvali (XLSX): boʻlimlar daraxt tartibida, boshligʻi yoʻq boʻlimlar qizil bilan belgilanadi. */
export async function GET() {
  const ExcelJS = (await import("exceljs")).default;
  const { applyMontserrat } = await import("@/lib/excel");

  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  if (!ALLOWED.includes(session.user.position)) return new NextResponse("forbidden", { status: 403 });

  const [tree, people, tp] = await Promise.all([
    getOrgTree("uz-latn"),
    listDirectory({ id: session.user.id, position: session.user.position }, {}, "uz-latn"),
    getTranslations({ locale: "uz-latn", namespace: "positions" }),
  ]);
  const byId = new Map<string, PersonRow>(people.map((p) => [p.id, p]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Markaz Ijro";
  wb.created = new Date();
  const ws = wb.addWorksheet("Shtat jadvali");
  ws.columns = COLUMNS;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const header = ws.getRow(1);
  header.height = 24;
  header.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle" };
  });

  const groupRow = (title: string, depth: number) => {
    const row = ws.addRow([title]);
    ws.mergeCells(row.number, 1, row.number, COLUMNS.length);
    const cell = row.getCell(1);
    cell.font = { bold: true, size: 12 };
    cell.fill = GROUP_FILL;
    cell.alignment = { vertical: "middle", indent: Math.min(depth, 10) };
    row.height = 22;
  };

  const noticeRow = (text: string) => {
    const row = ws.addRow([text]);
    ws.mergeCells(row.number, 1, row.number, COLUMNS.length);
    row.getCell(1).font = { bold: true, italic: true, color: { argb: RED } };
  };

  const personRow = (deptLabel: string, p: PersonLite) => {
    const full = byId.get(p.id);
    ws.addRow({
      dept: deptLabel,
      position: p.positionTitle ?? tp(p.position),
      name: p.fullName,
      email: full?.email ?? "",
      workPhone: full?.workPhone ?? "",
      ext: full?.internalExt ?? "",
      room: full?.room ?? "",
      manager: full?.managerName ?? "",
    });
  };

  if (tree.leadership.length > 0) {
    groupRow("Rahbariyat", 0);
    for (const p of tree.leadership) personRow("Rahbariyat", p);
  }

  for (const { node, depth } of flattenTree(tree.departments)) {
    groupRow(node.name, depth);
    if (!node.head) noticeRow("Boʻlim boshligʻi tayinlanmagan");
    if (node.head) personRow(node.name, node.head);
    for (const p of node.members) personRow(node.name, p);
  }

  if (tree.unassigned.length > 0) {
    groupRow("Boʻlimga biriktirilmagan", 0);
    for (const p of tree.unassigned) personRow("—", p);
  }

  applyMontserrat(ws);

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="shtat-jadvali-${tashkentToday()}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
