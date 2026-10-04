import { useLocale, useTranslations } from "next-intl";
import { IconPinFilled, IconChartBar, IconPaperclip } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { UserAvatar } from "@/components/ui/user-avatar";
import { timeAgo, formatDateTime } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import type { AnnouncementCard as AnnouncementCardData } from "@/server/queries/announcements";

/**
 * Lenta kartasi: oʻqilmagan nuqta, qadalgan belgisi, "Muhim" yorligʻi, parcha va
 * soʻrovnoma/ilova belgilari. Butun karta batafsil sahifaga havola.
 */
export function AnnouncementCard({ a }: { a: AnnouncementCardData }) {
  const t = useTranslations("staffX.announcements");
  const locale = useLocale();
  const important = a.importance === "important";
  const author = a.authorName ? localizeName(a.authorName, locale) : "—";

  return (
    <Link
      href={`/elonlar/${a.id}`}
      className="group block rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
    >
      <Card className="relative overflow-hidden p-4 sm:p-5">
        {important && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[var(--danger)]" />}
        <div className="flex items-start gap-3">
          <UserAvatar name={author} avatarUrl={a.authorAvatar} size="sm" clickable={false} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
              <span className="min-w-0 max-w-full truncate font-semibold text-[var(--foreground)]">{author}</span>
              <span aria-hidden>·</span>
              <time dateTime={new Date(a.createdAt).toISOString()} title={formatDateTime(a.createdAt, locale)}>
                {timeAgo(a.createdAt, locale)}
              </time>
              <span className="ml-auto flex shrink-0 items-center gap-2">
                {a.pinned && (
                  <span className="inline-flex items-center text-[var(--primary)]" title={t("pinned")}>
                    <IconPinFilled className="size-4" aria-hidden />
                    <span className="sr-only">{t("pinned")}</span>
                  </span>
                )}
                {important && (
                  <StatusTag tone="red" size="sm">
                    {t("important")}
                  </StatusTag>
                )}
                {!a.isRead && (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--primary)]">
                    <span aria-hidden className="size-2 rounded-full bg-[var(--primary)] shadow-[0_0_0_3px_var(--primary-soft)]" />
                    {t("unread")}
                  </span>
                )}
              </span>
            </div>

            <h3
              className={cn(
                "mt-1.5 line-clamp-2 break-words text-base tracking-tight transition-colors group-hover:text-[var(--primary)] sm:text-lg",
                a.isRead ? "font-semibold" : "font-bold"
              )}
            >
              {a.title}
            </h3>
            {a.excerpt && (
              <p className="mt-1 line-clamp-3 break-words text-sm leading-relaxed text-[var(--muted)]">{a.excerpt}</p>
            )}

            {(a.hasPoll || a.attachmentName) && (
              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-xs">
                {a.hasPoll && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary-soft)] px-2.5 py-1 font-semibold text-[var(--primary)]">
                    <IconChartBar className="size-3.5" aria-hidden />
                    {t("poll")}
                  </span>
                )}
                {a.attachmentName && (
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 font-medium text-[var(--muted)]">
                    <IconPaperclip className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{a.attachmentName}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
