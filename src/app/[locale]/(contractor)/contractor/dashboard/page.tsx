import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  IconFolder as Folder,
  IconHourglass as Hourglass,
  IconEye as Eye,
  IconAlarm as Alarm,
  IconMessageQuestion as Question,
  IconMessageCircle as Chat,
  IconChevronRight as Chevron,
  IconConfetti as Confetti,
} from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { DeadlineChip } from "@/components/studio/deadline-chip";
import { daysFromToday, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { getContractorUnreadCount } from "@/server/queries/projects";
import { getStudioCompany, getStudioDashboard } from "@/server/queries/studio";

export const dynamic = "force-dynamic";

const money = (n: number, c: string) => `${n.toLocaleString("ru-RU")} ${c}`;

// Studiya bosh sahifasi: qisqa ko'rsatkichlar, "sizdan kutilmoqda", muddatlar va to'lovlar.
export default async function StudioDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const company = await getStudioCompany(session.user.email);
  if (!company) notFound();

  const [d, unread] = await Promise.all([getStudioDashboard(company.id), getContractorUnreadCount(session.user.id)]);

  const tiles = [
    { key: "activeProjects", value: d.kpi.activeProjects, icon: Folder, href: "/contractor/projects", tone: "text-[var(--primary)]" },
    { key: "myTurn", value: d.kpi.myTurn, icon: Hourglass, href: "/contractor/projects", tone: "text-[#E08C10]", hot: d.kpi.myTurn > 0 ? "border-[#E08C10]/45 bg-[#E08C10]/[0.05]" : "" },
    { key: "awaitingReview", value: d.kpi.awaitingReview, icon: Eye, href: "/contractor/projects", tone: "text-[var(--muted)]" },
    { key: "overdue", value: d.kpi.overdue, icon: Alarm, href: "/contractor/deadlines", tone: "text-[#E02424]", hot: d.kpi.overdue > 0 ? "border-[#E02424]/45 bg-[#E02424]/[0.05]" : "" },
    { key: "pendingRequests", value: d.kpi.pendingRequests, icon: Question, href: "/contractor/projects", tone: "text-[var(--primary)]" },
  ] as const;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-semibold text-[var(--muted)]">{company.name}</p>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("studio.dashboard.title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("studio.dashboard.subtitle")}</p>
      </header>

      {/* Ko'rsatkichlar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(({ key, value, icon: Icon, href, tone, ...rest }) => {
          const hot = "hot" in rest ? rest.hot : "";
          return (
          <Link
            key={key}
            href={href}
            className={cn(
              "rounded-2xl border bg-[var(--card)] p-4 transition-colors hover:border-[var(--primary)]",
              hot || "border-[var(--border)]"
            )}
          >
            <Icon className={cn("size-5", tone)} />
            <p className="mt-3 text-2xl font-extrabold tabular-nums">{value}</p>
            <p className="mt-0.5 text-xs font-semibold leading-tight text-[var(--muted)]">{t(`studio.dashboard.kpi.${key}`)}</p>
          </Link>
          );
        })}
        <Link href="/contractor/chats" className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--primary)]">
          <Chat className="size-5 text-[var(--primary)]" />
          <p className="mt-3 text-2xl font-extrabold tabular-nums">{unread}</p>
          <p className="mt-0.5 text-xs font-semibold leading-tight text-[var(--muted)]">{t("nav.chats")}</p>
        </Link>
      </div>

      {/* Sizdan kutilmoqda */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="mb-4 text-base font-bold">{t("studio.dashboard.needsAction")}</h2>
          {d.actionStages.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--primary-soft)] p-4 text-sm font-semibold">
              <Confetti className="size-5 shrink-0 text-[var(--primary)]" /> {t("studio.dashboard.needsActionEmpty")}
            </div>
          ) : (
            <ul className="space-y-2">
              {d.actionStages.map((s) => {
                const changes = s.reviewStatus === "changes_requested";
                return (
                  <li key={s.stageId}>
                    <Link
                      href={`/contractor/projects/${s.projectId}/stages/${s.stageId}`}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-3.5 transition-colors hover:border-[var(--primary)]",
                        changes ? "border-[#E02424]/35 bg-[#E02424]/[0.05]" : "border-[var(--border)]"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-bold">{s.stageName}</p>
                        <p className="break-words text-xs text-[var(--muted)]">{s.projectName}</p>
                        {changes && s.reviewNote && <p className="mt-1 line-clamp-2 text-xs italic text-[#E02424]">{s.reviewNote}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <StatusTag tone={changes ? "red" : "amber"} size="sm">
                          {changes ? t("studio.dashboard.changesRequested") : t("studio.dashboard.inProgress")}
                        </StatusTag>
                        {s.deadline && <DeadlineChip days={daysFromToday(s.deadline)} />}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Yaqin muddatlar */}
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-bold">{t("studio.dashboard.upcoming")}</h2>
              <Link href="/contractor/deadlines" className="inline-flex items-center gap-0.5 text-sm font-semibold text-[var(--primary)] hover:underline">
                {t("studio.dashboard.viewAll")} <Chevron className="size-4" />
              </Link>
            </div>
            {d.deadlines.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted)]">{t("studio.deadlines.empty")}</p>
            ) : (
              <ul className="space-y-2.5">
                {d.deadlines.map((r) => (
                  <li key={r.stageId} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.stageName}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{r.projectName} · {formatDate(r.deadline, locale)}</p>
                    </div>
                    <DeadlineChip days={daysFromToday(r.deadline)} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* To'lovlar */}
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-bold">{t("studio.dashboard.paymentsSummary")}</h2>
              <Link href="/contractor/payments" className="inline-flex items-center gap-0.5 text-sm font-semibold text-[var(--primary)] hover:underline">
                {t("studio.dashboard.viewAll")} <Chevron className="size-4" />
              </Link>
            </div>
            {d.paymentTotals.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted)]">{t("studio.payments.empty")}</p>
            ) : (
              <div className="space-y-4">
                {d.paymentTotals.map((tt) => (
                  <div key={tt.currency} className="grid grid-cols-2 gap-3 rounded-2xl bg-[var(--surface-2)] p-3.5">
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--muted)]">{t("studio.payments.paid")}</p>
                      <p className="truncate font-extrabold tabular-nums text-[#16A34A]">{money(tt.paid, tt.currency)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--muted)]">{t("studio.payments.pending")}</p>
                      <p className="truncate font-extrabold tabular-nums text-[#E08C10]">{money(tt.pending, tt.currency)}</p>
                    </div>
                  </div>
                ))}
                {d.recentPayments.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--subtle)]">{t("studio.dashboard.recentPayments")}</p>
                    <ul className="space-y-2">
                      {d.recentPayments.map((p) => (
                        <li key={p.id} className="flex items-center gap-3 text-sm">
                          <span className="min-w-0 flex-1 truncate">{p.projectName} · {p.stageName}</span>
                          <span className="shrink-0 font-semibold tabular-nums">{money(p.amount, p.currency)}</span>
                          <StatusTag tone={p.status === "paid" ? "green" : "amber"} size="sm">
                            {p.status === "paid" ? t("studio.payments.paid") : t("studio.payments.pending")}
                          </StatusTag>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
