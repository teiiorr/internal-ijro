import { getTranslations } from "next-intl/server";
import { IconSpeakerphone, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { requireUser } from "@/lib/session";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { AnnouncementCard } from "@/components/staff/announcements/announcement-card";
import { AnnouncementForm } from "@/components/staff/announcements/announcement-form";
import { ANNOUNCEMENTS_PAGE_SIZE, todayTashkentYmd } from "@/components/staff/announcements/logic";
import { canPost, getComposerOptions, listAnnouncements } from "@/server/queries/announcements";

export const dynamic = "force-dynamic";

const PAGER =
  "inline-flex h-10 items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm font-semibold transition-colors";

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const me = await requireUser();
  const t = await getTranslations("staffX.announcements");
  const sp = await searchParams;
  let page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const posting = canPost(me);

  const [first, composer] = await Promise.all([
    listAnnouncements(me, page),
    posting ? getComposerOptions(me) : Promise.resolve(null),
  ]);
  let { rows } = first;
  const { total } = first;
  const pages = Math.max(1, Math.ceil(total / ANNOUNCEMENTS_PAGE_SIZE));
  // ?page= oxirgi sahifadan katta boʻlsa (masalan, eʼlon oʻchirilgach) — boʻsh holat emas, oxirgi sahifa.
  if (rows.length === 0 && total > 0 && page > pages) {
    page = pages;
    rows = (await listAnnouncements(me, page)).rows;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("subtitle")}</p>
        </div>
        {composer && <AnnouncementForm options={composer} today={todayTashkentYmd()} />}
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={IconSpeakerphone} title={t("empty")} />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <AnnouncementCard key={a.id} a={a} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label={t("pagination")} className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link
              href={`/elonlar?page=${page - 1}`}
              aria-label={t("prevPage")}
              className={cn(PAGER, "hover:bg-[var(--surface-2)]")}
            >
              <IconChevronLeft className="size-4" />
              <span className="hidden sm:inline">{t("prevPage")}</span>
            </Link>
          ) : (
            <span aria-disabled className={cn(PAGER, "pointer-events-none opacity-40")}>
              <IconChevronLeft className="size-4" />
              <span className="hidden sm:inline">{t("prevPage")}</span>
            </span>
          )}
          <span className="text-sm font-semibold tabular-nums text-[var(--muted)]">
            {t("pageOf", { page: Math.min(page, pages), total: pages })}
          </span>
          {page < pages ? (
            <Link
              href={`/elonlar?page=${page + 1}`}
              aria-label={t("nextPage")}
              className={cn(PAGER, "hover:bg-[var(--surface-2)]")}
            >
              <span className="hidden sm:inline">{t("nextPage")}</span>
              <IconChevronRight className="size-4" />
            </Link>
          ) : (
            <span aria-disabled className={cn(PAGER, "pointer-events-none opacity-40")}>
              <span className="hidden sm:inline">{t("nextPage")}</span>
              <IconChevronRight className="size-4" />
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
