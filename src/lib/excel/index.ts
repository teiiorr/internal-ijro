import "server-only";
import ExcelJS from "exceljs";

export const EXCEL_FONT = "Montserrat";

/**
 * Applies Montserrat font to every cell in the worksheet, with
 * extra weight on the header row. Call AFTER all rows have been added.
 */
export function applyMontserrat(ws: ExcelJS.Worksheet) {
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      const current = cell.font ?? {};
      cell.font = {
        ...current,
        name: EXCEL_FONT,
        family: 2,
        size: current.size ?? 11,
        bold: rowNumber === 1 ? true : current.bold ?? false,
      };
    });
  });
}

export async function buildEmployeesXlsx(
  rows: Array<{
    fullName: string;
    email: string;
    phone: string | null;
    position: string;
    departmentName: string | null;
    status: string;
    hireDate: string | null;
  }>,
  title = "Employees"
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ichki Ijro";
  wb.created = new Date();
  const ws = wb.addWorksheet(title);
  ws.columns = [
    { header: "Full name", key: "fullName", width: 30 },
    { header: "Email", key: "email", width: 30 },
    { header: "Phone", key: "phone", width: 20 },
    { header: "Position", key: "position", width: 22 },
    { header: "Department", key: "departmentName", width: 26 },
    { header: "Status", key: "status", width: 14 },
    { header: "Hire date", key: "hireDate", width: 14 },
  ];
  rows.forEach((r) => ws.addRow(r));
  applyMontserrat(ws);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
