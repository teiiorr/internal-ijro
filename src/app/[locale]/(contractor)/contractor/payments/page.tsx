import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { IconCoins as Coins } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { formatDate } from "@/lib/dates";
import { getStudioCompany, getStudioPayments } from "@/server/queries/studio";

export const dynamic = "force-dynamic";

const money = (n: number, c: string) => `${n.toLocaleString("ru-RU")} ${c}`;

// Studiya: o'z loyihalari bosqichlari bo'yicha barcha to'lovlar (faqat o'qish).
export default async function StudioPaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const company = await getStudioCompany(session.user.email);
  if (!company) notFound();

  const { items, totals } = await getStudioPayments(company.id);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("studio.payments.title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("studio.payments.subtitle")}</p>
      </header>

      {totals.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {totals.map((tt) => {
            const all = tt.paid + tt.pending;
            const pct = all > 0 ? Math.round((tt.paid / all) * 100) : 0;
            return (
              <Card key={tt.currency}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
                    <Coins className="size-4" /> {t("studio.payments.total")} · {tt.currency}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--muted)]">{t("studio.payments.paid")}</p>
                      <p className="truncate text-lg font-extrabold tabular-nums text-[#16A34A]">{money(tt.paid, tt.currency)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--muted)]">{t("studio.payments.pending")}</p>
                      <p className="truncate text-lg font-extrabold tabular-nums text-[#E08C10]">{money(tt.pending, tt.currency)}</p>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div className="h-full rounded-full bg-[#16A34A]" style={{ width: `${pct}%` }} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="py-14 text-center text-sm text-[var(--muted)]">{t("studio.payments.empty")}</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {items.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
                  <div className="min-w-0 flex-1 basis-56">
                    <Link href={`/contractor/projects/${p.projectId}`} className="break-words font-semibold hover:underline">
                      {p.projectName}
                    </Link>
                    <p className="mt-0.5 break-words text-xs text-[var(--muted)]">
                      {p.stageOrder + 1}. {p.stageName}
                      {p.note ? ` · ${p.note}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums">{money(p.amount, p.currency)}</p>
                    <p className="text-xs text-[var(--muted)]">{formatDate(p.paidAt ?? p.createdAt, locale)}</p>
                  </div>
                  <StatusTag tone={p.status === "paid" ? "green" : "amber"} size="sm">
                    {p.status === "paid" ? t("studio.payments.paid") : t("studio.payments.pending")}
                  </StatusTag>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
