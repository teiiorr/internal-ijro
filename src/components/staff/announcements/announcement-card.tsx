import { useLocale, useTranslations } from "next-intl";
import { IconPinFilled, IconChartBar, IconPaperclip } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Status } from "@/components/ui-biib/Status";
import { Row } from "@/components/ui-biib/Rows";
import { timeAgo, formatDateTime } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import type { AnnouncementCard as AnnouncementCardData } from "@/server/queries/announcements";

/** Soʻrovnoma / ilova belgilari — kapsulasiz, oddiy --ink-3 belgilar (ekran oʻquvchi uchun yorliq). */
function Markers({
  a,
  pollLabel,
  attachmentLabel,
  className,
}: {
  a: AnnouncementCardData;
  pollLabel: string;
  attachmentLabel: string;
  className?: string;
}) {
  if (!a.hasPoll && !a.attachmentName) return null;
  return (
    <span className={cn("flex shrink-0 items-center gap-2.5 text-[var(--ink-3)]", className)}>
      {a.hasPoll && (
        <span title={pollLabel}>
          <IconChartBar className="size-4" aria-hidden />
          <span className="sr-only">{pollLabel}</span>
        </span>
      )}
      {a.attachmentName && (
        <span title={a.attachmentName}>
          <IconPaperclip className="size-4" aria-hidden />
          <span className="sr-only">{attachmentLabel}</span>
        </span>
      )}
    </span>
  );
}

/**
 * Lenta boshidagi yetakchi eʼlon: prominent (ammo Manrope, oltin/Unbounded emas) sarlavha,
 * parcha va ajratuvchi chiziq ustidagi muallif/vaqt qatori. Butun sarlavha — havola.
 */
export function AnnouncementLead({ a }: { a: AnnouncementCardData }) {
  const t = useTranslations("staffX.announcements");
  const locale = useLocale();
  const important = a.importance === "important";
  const author = a.authorName ? localizeName(a.authorName, locale) : "—";

  return (
    <article className="group min-w-0">
      {(important || a.pinned || !a.isRead) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {!a.isRead && (
            <Status tone="info" dot>
              {t("unread")}
            </Status>
          )}
          {important && <Status tone="danger">{t("important")}</Status>}
          {a.pinned && (
            <span className="inline-flex items-center gap-1 t-micro text-[var(--ink-2)]">
              <IconPinFilled className="size-3.5" aria-hidden />
              {t("pinned")}
            </span>
          )}
        </div>
      )}

      <h2 className="min-w-0">
        <Link
          href={`/elonlar/${a.id}`}
          className="block break-words font-[family-name:var(--font-ui)] text-[1.25rem] font-bold leading-snug tracking-tight text-balance text-[var(--ink)] transition-colors group-hover:text-[var(--tint)] sm:text-[1.5rem]"
        >
          {a.title}
        </Link>
      </h2>

      {a.excerpt && (
        <p className="mt-3 line-clamp-3 max-w-[var(--measure)] break-words t-body text-[var(--ink-2)]">{a.excerpt}</p>
      )}

      <div className="mt-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--line)] pt-4 t-small text-[var(--ink-3)]">
        <span className="inline-flex min-w-0 items-center gap-2">
          <UserAvatar name={author} avatarUrl={a.authorAvatar} size="xs" clickable={false} />
          <span className="truncate font-medium text-[var(--ink-2)]">{author}</span>
        </span>
        <time dateTime={new Date(a.createdAt).toISOString()} title={formatDateTime(a.createdAt, locale)}>
          {timeAgo(a.createdAt, locale)}
        </time>
        <Markers a={a} pollLabel={t("poll")} attachmentLabel={t("attachment")} className="ml-auto" />
      </div>
    </article>
  );
}

/**
 * Lentaning ixcham qatori (ajratuvchi roʻyxat ichida): oʻqilmagan nuqtasi, qadalgan belgisi,
 * sarlavha va muallif/vaqt, oʻngda "Muhim" holati va belgilar. Butun qator — havola.
 */
export function AnnouncementRow({ a }: { a: AnnouncementCardData }) {
  const t = useTranslations("staffX.announcements");
  const locale = useLocale();
  const important = a.importance === "important";
  const author = a.authorName ? localizeName(a.authorName, locale) : "—";

  return (
    <Row href={`/elonlar/${a.id}`}>
      <span className="flex w-2 shrink-0 justify-center" aria-hidden>
        {!a.isRead && <span className="size-2 rounded-full bg-[var(--tint)]" />}
      </span>
      {!a.isRead && <span className="sr-only">{t("unread")}</span>}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {a.pinned && <IconPinFilled className="size-3.5 shrink-0 text-[var(--ink-3)]" aria-hidden />}
          <span
            className={cn(
              "min-w-0 truncate text-[0.9375rem] text-[var(--ink)]",
              a.isRead ? "font-medium" : "font-semibold",
            )}
          >
            {a.title}
          </span>
        </div>
        <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">
          {author}, {timeAgo(a.createdAt, locale)}
        </p>
      </div>

      {important && (
        <Status tone="danger" className="shrink-0">
          {t("important")}
        </Status>
      )}
      <Markers a={a} pollLabel={t("poll")} attachmentLabel={t("attachment")} />
    </Row>
  );
}
