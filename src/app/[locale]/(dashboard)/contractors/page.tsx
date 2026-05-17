import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listContractors } from "@/server/queries/projects";
import { Card, CardContent } from "@/components/ui/card";
import { ContractorRow } from "@/components/projects/contractor-row";

export default async function ContractorsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  if (!["direktor", "orinbosar", "koordinator"].includes(session.user.position)) redirect("/dashboard");

  const rows = await listContractors(null);
  const pending = rows.filter((r) => r.status === "pending");
  const others = rows.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("contractors.pageTitle")}</h1>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-semibold text-lg">{t("contractors.pendingTitle")} ({pending.length})</h2>
          {pending.length === 0 && <p className="text-sm text-[var(--muted)]">{t("contractors.none")}</p>}
          {pending.map((c) => (
            <ContractorRow key={c.id} c={{ ...c, rating: c.rating as string | null }} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-semibold text-lg">{t("contractors.allTitle")}</h2>
          {others.map((c) => (
            <ContractorRow key={c.id} c={{ ...c, rating: c.rating as string | null }} />
          ))}
          {others.length === 0 && <p className="text-sm text-[var(--muted)]">None.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
