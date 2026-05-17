import "server-only";
import ExcelJS from "exceljs";

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
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
