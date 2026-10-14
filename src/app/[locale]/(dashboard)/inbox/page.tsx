import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { inboxAwaitingMyApproval, inboxDeadlineRequests } from "@/server/queries/inbox";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { IconClipboardCheck, IconClockEdit, IconInbox } from "@tabler/icons-react";

/**
 * Soʻrovlar markazi — bitta joyda "mening qarorimni kutayotgan" narsalar:
 * ijrochi javoblari (tasdiq) va muddatni uzaytirish soʻrovlari. Har biri
 * tegishli topshiriq sahifasiga olib boradi.
 */
export default async function ApprovalsInboxPage() {
  const me = await requireUser();
  const t = await getTranslations();
  const [approvals, deadlineReqs] = await Promise.all([
    inboxAwaitingMyApproval(me.id),
    inboxDeadlineRequests(me.id),
  ]);
  const empty = approvals.length === 0 && deadlineReqs.length === 0;

  return (
    <div>
      <PageHeader title={t("inbox.pageTitle")} />

      {empty ? (
        <EmptyState icon={IconInbox} title={t("inbox.empty")} />
      ) : (
        <div className="flex min-w-0 flex-col gap-8">
          {approvals.length > 0 && (
            <Section title={t("inbox.awaitingApproval")}>
              <Card bare solid className="divide-y divide-[var(--line)] overflow-hidden">
                {approvals.map((a) => (
                  <Link
                    key={a.id}
                    href={`/tasks/${a.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors [@media(hover:hover)]:hover:bg-[var(--surface-2)]"
                  >
                    <IconClipboardCheck className="size-5 shrink-0 text-[var(--warning)]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate t-small font-medium text-[var(--ink)]">{a.title}</p>
                      {a.responseFromName && (
                        <p className="truncate t-micro text-[var(--ink-3)]">{t("inbox.responsePrefix")} {a.responseFromName}</p>
                      )}
                    </div>
                    {a.registrationNumber && (
                      <span className="shrink-0 t-micro tabular-nums text-[var(--ink-3)]">{a.registrationNumber}</span>
                    )}
                  </Link>
                ))}
              </Card>
            </Section>
          )}

          {deadlineReqs.length > 0 && (
            <Section title={t("inbox.deadlineRequests")} meta={undefined}>
              <Card bare solid className="divide-y divide-[var(--line)] overflow-hidden">
                {deadlineReqs.map((d) => (
                  <Link
                    key={d.requestId}
                    href={`/tasks/${d.taskId}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors [@media(hover:hover)]:hover:bg-[var(--surface-2)]"
                  >
                    <IconClockEdit className="size-5 shrink-0 text-[var(--tint)]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate t-small font-medium text-[var(--ink)]">{d.title}</p>
                      <p className="flex items-center gap-1.5 truncate t-micro text-[var(--ink-3)]">
                        <UserAvatar name={d.requesterName} avatarUrl={d.avatarUrl} size="xs" clickable={false} />
                        {t("inbox.requestedBy")} {d.requesterName}
                      </p>
                    </div>
                    {d.extraDays > 0 && (
                      <span className="shrink-0 t-micro font-semibold tabular-nums text-[var(--warning)]">
                        {t("inbox.extraDays", { days: d.extraDays })}
                      </span>
                    )}
                  </Link>
                ))}
              </Card>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
