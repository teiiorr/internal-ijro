import { getTranslations } from "next-intl/server";
import { IconSpeakerphone, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { requireUser } from "@/lib/session";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui-biib/Card";
import { Rows } from "@/components/ui-biib/Rows";
import { Button } from "@/components/ui-biib/Button";
import { AnnouncementLead, AnnouncementRow } from "@/components/staff/announcements/announcement-card";
import { AnnouncementForm } from "@/components/staff/announcements/announcement-form";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { ANNOUNCEMENTS_PAGE_SIZE, todayTashkentYmd } from "@/components/staff/announcements/logic";
import { canPost, getComposerOptions, listAnnouncements } from "@/server/queries/announcements";

export const dynamic = "force-dynamic";

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

  const [lead, ...rest] = rows;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t("title")}
        actions={composer && <AnnouncementForm options={composer} today={todayTashkentYmd()} />}
      />

      <div className="flex flex-col gap-8 lg:gap-12">
        {rows.length === 0 ? (
          <Card>
            <EmptyState icon={IconSpeakerphone} title={t("empty")} />
          </Card>
        ) : (
          // Tahririy lenta: bitta yetakchi eʼlon, keyin ixcham ajratuvchi qatorlar.
          <div className="flex flex-col gap-8">
            <AnnouncementLead a={lead} />
            {rest.length > 0 && (
              <Card bare className="px-5 sm:px-6">
                <Rows>
                  {rest.map((a) => (
                    <AnnouncementRow key={a.id} a={a} />
                  ))}
                </Rows>
              </Card>
            )}
          </div>
        )}

        {pages > 1 && (
          <nav aria-label={t("pagination")} className="flex items-center justify-between gap-3">
            {page > 1 ? (
              <Button asChild variant="ghost" size="40" icon={IconChevronLeft} iconPosition="start">
                <Link href={`/elonlar?page=${page - 1}`} aria-label={t("prevPage")}>
                  <span className="hidden sm:inline">{t("prevPage")}</span>
                </Link>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="40"
                icon={IconChevronLeft}
                iconPosition="start"
                disabled
                aria-label={t("prevPage")}
              >
                <span className="hidden sm:inline">{t("prevPage")}</span>
              </Button>
            )}
            <span className="t-small tabular-nums text-[var(--ink-3)]">
              {t("pageOf", { page: Math.min(page, pages), total: pages })}
            </span>
            {page < pages ? (
              <Button asChild variant="ghost" size="40" icon={IconChevronRight} iconPosition="end">
                <Link href={`/elonlar?page=${page + 1}`} aria-label={t("nextPage")}>
                  <span className="hidden sm:inline">{t("nextPage")}</span>
                </Link>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="40"
                icon={IconChevronRight}
                iconPosition="end"
                disabled
                aria-label={t("nextPage")}
              >
                <span className="hidden sm:inline">{t("nextPage")}</span>
              </Button>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
