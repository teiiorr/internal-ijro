import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { IconCalendar, IconUsers, IconHourglass, IconDownload, IconPaperclip, IconPinFilled } from "@tabler/icons-react";
import { requireUser } from "@/lib/session";
import { describeAudience } from "@/lib/audience";
import { formatDate, formatDateTime } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { BackButton } from "@/components/ui/back-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card } from "@/components/ui-biib/Card";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Section } from "@/components/ui-biib/Section";
import { Status } from "@/components/ui-biib/Status";
import { DocMarkdown } from "@/components/councils/doc-markdown";
import { PollBlock } from "@/components/staff/announcements/poll-block";
import { ReadReceipts } from "@/components/staff/announcements/read-receipts";
import { MarkRead } from "@/components/staff/announcements/mark-read";
import { EditAnnouncementButton, DeleteAnnouncementButton } from "@/components/staff/announcements/announcement-manage";
import { tashkentYmd, todayTashkentYmd } from "@/components/staff/announcements/logic";
import { getAnnouncement, getReadReceipts } from "@/server/queries/announcements";

export const dynamic = "force-dynamic";

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const a = await getAnnouncement(me, id);
  if (!a) notFound();

  const [t, tr, locale] = await Promise.all([
    getTranslations("staffX.announcements"),
    getTranslations(),
    getLocale(),
  ]);
  const receipts = a.canSeeReceipts ? await getReadReceipts(me, a.id) : null;

  const depts = new Map(a.audienceDepartments.map((d) => [d.id, d.name]));
  const audienceText = describeAudience(a.audience, depts, (k) => (k.startsWith("positions.") ? tr(k) : t(k)));
  const important = a.importance === "important";
  const author = a.authorName ? localizeName(a.authorName, locale) : "—";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={<BackButton fallbackHref="/elonlar" />}
        title={a.title}
        actions={
          a.canManage ? (
            <>
              <EditAnnouncementButton
                a={{
                  id: a.id,
                  title: a.title,
                  body: a.body,
                  pinnedUntil: a.pinnedUntil ? tashkentYmd(a.pinnedUntil) : null,
                  expiresAt: a.expiresAt ? tashkentYmd(a.expiresAt) : null,
                }}
                today={todayTashkentYmd()}
              />
              <DeleteAnnouncementButton id={a.id} />
            </>
          ) : null
        }
      />

      <div className="flex flex-col gap-8 lg:gap-12">
        {/* Sarlavha ostidagi holat + metadata (oltin yoʻq, chapga tekis) */}
        <div className="flex min-w-0 flex-col gap-3">
          {(important || (a.pinned && a.pinnedUntil)) && (
            <div className="flex flex-wrap items-center gap-2">
              {important && <Status tone="danger">{t("important")}</Status>}
              {a.pinned && a.pinnedUntil && (
                <span className="inline-flex items-center gap-1.5 t-micro text-[var(--ink-2)]">
                  <IconPinFilled className="size-3.5" aria-hidden />
                  {t("pinnedUntilOn", { date: formatDate(a.pinnedUntil, locale) })}
                </span>
              )}
            </div>
          )}
          <div className="flex min-w-0 flex-col gap-2 t-small text-[var(--ink-3)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
            <span className="inline-flex min-w-0 items-center gap-2">
              <UserAvatar name={author} avatarUrl={a.authorAvatar} size="xs" />
              <span className="truncate font-medium text-[var(--ink-2)]">{author}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconCalendar className="size-4 shrink-0" aria-hidden />
              <time dateTime={new Date(a.createdAt).toISOString()}>{formatDateTime(a.createdAt, locale)}</time>
            </span>
            <span className="inline-flex min-w-0 items-start gap-1.5">
              <IconUsers className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="min-w-0 break-words">{audienceText}</span>
            </span>
            {a.expiresAt && (
              <span className="inline-flex items-center gap-1.5">
                <IconHourglass className="size-4 shrink-0" aria-hidden />
                {t("expiresOn", { date: formatDate(a.expiresAt, locale) })}
              </span>
            )}
          </div>
        </div>

        {/* Oʻqish ustuni: matn + ilova (ajratuvchi qator, quti emas) */}
        {(a.body || a.attachmentUrl) && (
          <div className="flex min-w-0 max-w-[var(--measure)] flex-col gap-6">
            {a.body && (
              <div className="min-w-0 break-words [&>div]:text-[0.9375rem] [&>div]:leading-relaxed [&_img]:h-auto [&_img]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[var(--surface-2)] [&_pre]:p-3">
                <DocMarkdown>{a.body}</DocMarkdown>
              </div>
            )}
            {a.attachmentUrl && (
              <a
                href={a.attachmentUrl}
                download={a.attachmentName ?? undefined}
                className="flex min-w-0 items-center gap-3 border-t border-[var(--line)] pt-4 transition-colors hover:text-[var(--tint)]"
              >
                <IconPaperclip className="size-5 shrink-0 text-[var(--ink-3)]" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block t-micro text-[var(--ink-3)]">{t("attachment")}</span>
                  <span className="block truncate text-[0.9375rem] font-medium text-[var(--ink)]">
                    {a.attachmentName ?? tr("common.file")}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 t-label text-[var(--tint)]">
                  <IconDownload className="size-4" aria-hidden />
                  <span className="hidden sm:inline">{tr("common.download")}</span>
                </span>
              </a>
            )}
          </div>
        )}

        {a.poll && (
          <Card>
            <PollBlock announcementId={a.id} poll={a.poll} showResultsAlways={a.isAuthor} />
          </Card>
        )}

        {receipts && (
          <Section title={t("receiptsTitle")} meta={t("seen", { read: receipts.read, total: receipts.total })}>
            <Card>
              <ReadReceipts
                announcementId={a.id}
                read={receipts.read}
                total={receipts.total}
                unread={receipts.unread}
                lastRemindedLabel={receipts.lastRemindedAt ? formatDateTime(receipts.lastRemindedAt, locale) : null}
              />
            </Card>
          </Section>
        )}
      </div>

      {!a.isRead && <MarkRead id={a.id} />}
    </div>
  );
}
