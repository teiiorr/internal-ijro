import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { IconArrowRight, IconCalendarCheck } from "@tabler/icons-react";
import { getTodaySummary } from "@/server/queries/my-work";
import { cn } from "@/lib/utils";
import { Tag } from "@/components/ui-biib/Tag";
import { KIND_ICON, KIND_TONE } from "./kind-meta";

/**
 * Boshqaruv paneli uchun ixcham "Bugun" tasmasi. Hech narsa boʻlmasa — hech narsa chizilmaydi.
 * Shaxsiy eslatmalar bu yerda hisoblanmaydi (getTodaySummary ularni chiqarib tashlaydi).
 */
export async function TodayStrip({ userId, locale }: { userId: string; locale: string }) {
  const s = await getTodaySummary(userId, locale);
  if (s.today === 0 && s.overdue === 0 && s.approvals === 0) return null;
  const t = await getTranslations({ locale, namespace: "staffX.myWork" });

  return (
    <div className="glass-strong flex flex-col gap-3 rounded-2xl px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
          <IconCalendarCheck className="size-[18px]" aria-hidden />
        </span>
        <h2 className="mr-1 text-base font-bold tracking-tight">{t("todayStripTitle")}</h2>
        {s.today > 0 && <Tag tone="info">{t("todayCount", { count: s.today })}</Tag>}
        {s.overdue > 0 && <Tag tone="danger">{t("overdueCount", { count: s.overdue })}</Tag>}
        {s.approvals > 0 && <Tag tone="warning">{t("approvalsCount", { count: s.approvals })}</Tag>}
      </div>

      {s.top.length > 0 && (
        <ul className="flex min-w-0 flex-1 flex-col gap-1 lg:flex-row lg:flex-wrap lg:gap-x-4">
          {s.top.map((item) => {
            const Icon = KIND_ICON[item.kind];
            const inner = (
              <>
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", KIND_TONE[item.kind])}>
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <span className={cn("min-w-0 truncate", item.bucket === "overdue" && "text-[var(--danger)]")}>{item.title}</span>
              </>
            );
            return (
              <li key={item.key} className="min-w-0 lg:max-w-[16rem]">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="flex min-w-0 items-center gap-2 rounded-lg py-0.5 text-sm font-semibold transition-colors hover:text-[var(--primary)]"
                  >
                    {inner}
                  </Link>
                ) : (
                  <span className="flex min-w-0 items-center gap-2 py-0.5 text-sm font-semibold">{inner}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/my-work"
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl px-2 py-1 text-sm font-bold text-[var(--primary)] transition-colors hover:bg-[var(--primary-soft)] lg:ml-auto lg:self-center"
      >
        {t("openAll")}
        <IconArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
