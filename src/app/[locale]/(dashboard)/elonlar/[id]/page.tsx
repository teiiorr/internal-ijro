import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { IconCalendar, IconUsers, IconPinFilled, IconHourglass, IconDownload, IconPaperclip } from "@tabler/icons-react";
import { requireUser } from "@/lib/session";
import { describeAudience } from "@/lib/audience";
import { formatDate, formatDateTime } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { UserAvatar } from "@/components/ui/user-avatar";
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
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-2">
        <BackButton fallbackHref="/elonlar" />
        {a.canManage && (
          <div className="flex items-center gap-2">
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
          </div>
        )}
      </div>

      <header className="min-w-0">
        {(important || a.pinned) && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {important && <StatusTag tone="red">{t("important")}</StatusTag>}
            {a.pinned && a.pinnedUntil && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
                <IconPinFilled className="size-4" aria-hidden />
                {t("pinnedUntilOn", { date: formatDate(a.pinnedUntil, locale) })}
              </span>
            )}
          </div>
        )}
        <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{a.title}</h1>
        <div className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
          <span className="inline-flex min-w-0 items-center gap-2">
            <UserAvatar name={author} avatarUrl={a.authorAvatar} size="xs" />
            <span className="truncate font-semibold text-[var(--foreground)]">{author}</span>
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
      </header>

      {(a.body || a.attachmentUrl) && (
        <Card>
          <CardContent className="space-y-5 p-5 sm:p-6">
            {a.body && (
              <div className="min-w-0 break-words [&>div]:text-[15px] [&_img]:h-auto [&_img]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[var(--surface-2)] [&_pre]:p-3">
                <DocMarkdown>{a.body}</DocMarkdown>
              </div>
            )}
            {a.attachmentUrl && (
              <a
                href={a.attachmentUrl}
                download={a.attachmentName ?? undefined}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                  <IconPaperclip className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-[var(--muted)]">{t("attachment")}</span>
                  <span className="block truncate text-sm font-semibold">{a.attachmentName ?? tr("common.file")}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[var(--primary)]">
                  <IconDownload className="size-4" aria-hidden />
                  <span className="hidden sm:inline">{tr("common.download")}</span>
                </span>
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {a.poll && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <PollBlock announcementId={a.id} poll={a.poll} showResultsAlways={a.isAuthor} />
          </CardContent>
        </Card>
      )}

      {receipts && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <ReadReceipts
              announcementId={a.id}
              read={receipts.read}
              total={receipts.total}
              unread={receipts.unread}
              lastRemindedLabel={receipts.lastRemindedAt ? formatDateTime(receipts.lastRemindedAt, locale) : null}
            />
          </CardContent>
        </Card>
      )}

      {!a.isRead && <MarkRead id={a.id} />}
    </div>
  );
}
