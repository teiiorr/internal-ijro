import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { IconArrowRight, IconCalendarCheck } from "@tabler/icons-react";
import { getTodaySummary } from "@/server/queries/my-work";
import { cn } from "@/lib/utils";
import { KIND_ICON, KIND_TONE } from "./kind-meta";

/**
 * Boshqaruv paneli uchun "Bugun" bloki — IKKI QISM: yuqorida qisqa sarhisob
 * (plashkasiz, faqat rangli matn), pastda (chiziq orqali ajratilgan) bugungi
 * ishlar ro'yxati. Hech narsa bo'lmasa — hech narsa chizilmaydi.
 */
export async function TodayStrip({ userId, locale }: { userId: string; locale: string }) {
  const s = await getTodaySummary(userId, locale);
  if (s.today === 0 && s.overdue === 0 && s.approvals === 0) return null;
  const t = await getTranslations({ locale, namespace: "staffX.myWork" });

  return (
    <div className="glass-strong rounded-2xl p-4 sm:p-5">
      {/* 1-qism: sarlavha + sarhisob (plashkasiz, rangli matn) */}
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
          <IconCalendarCheck className="size-[18px]" aria-hidden />
        </span>
        <h2 className="flex-1 text-base font-bold tracking-tight">{t("todayStripTitle")}</h2>
        <Link
          href="/my-work"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-[var(--primary)] transition-opacity hover:opacity-80"
        >
          {t("openAll")}
          <IconArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[15px] font-semibold">
        {s.today > 0 && <span className="text-[var(--primary)]">{t("todayCount", { count: s.today })}</span>}
        {s.overdue > 0 && <span className="text-[var(--danger)]">{t("overdueCount", { count: s.overdue })}</span>}
        {s.approvals > 0 && <span className="text-[var(--warning)]">{t("approvalsCount", { count: s.approvals })}</span>}
      </div>

      {/* 2-qism: bugungi ishlar ro'yxati (chiziq orqali ajratilgan) */}
      {s.top.length > 0 && (
        <>
          <div className="my-3.5 h-px bg-[var(--border)]" />
          <ul className="space-y-2">
            {s.top.map((item) => {
              const Icon = KIND_ICON[item.kind];
              const inner = (
                <>
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", KIND_TONE[item.kind])}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate", item.bucket === "overdue" && "text-[var(--danger)]")}>{item.title}</span>
                </>
              );
              return (
                <li key={item.key}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="flex min-w-0 items-center gap-2.5 rounded-lg py-0.5 text-sm font-semibold transition-colors hover:text-[var(--primary)]"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <span className="flex min-w-0 items-center gap-2.5 py-0.5 text-sm font-semibold">{inner}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
