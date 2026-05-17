import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listEmployees } from "@/server/queries/employees";
import { buildEmployeesXlsx } from "@/lib/excel";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });
  if (!["direktor", "orinbosar", "hr"].includes(session.user.position))
    return new NextResponse("forbidden", { status: 403 });

  const sp = req.nextUrl.searchParams;
  const { rows } = await listEmployees({
    search: sp.get("q") ?? undefined,
    departmentId: sp.get("departmentId") ?? undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    position: (sp.get("position") as any) ?? undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: (sp.get("status") as any) ?? undefined,
    limit: 5000,
  });
  const buf = await buildEmployeesXlsx(rows);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="employees-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
