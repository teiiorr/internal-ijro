import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { IconClipboardCheck as ClipboardCheck, IconCircleCheck as CheckCircle2, IconListCheck as ListTodo, IconChevronRight as ChevronRight } from "@tabler/icons-react";
import { inboxAwaitingMyApproval, inboxDeadlineRequests, inboxMyActive, type DeadlineRequestInboxItem, type InboxItem } from "@/server/queries/inbox";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { shortName } from "@/lib/names";
import { UserAvatar } from "@/components/ui/user-avatar";
import { StatusTag } from "@/components/ui/status-tag";

function Row({ item, prefix }: { item: InboxItem; prefix?: string }) {
  return (
    <Link
      href={`/tasks/${item.id}`}
      className="group flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[var(--surface-3)] transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold truncate">{item.title}</p>
        <div className="flex items-center gap-2 mt-1 text-[13px] text-[var(--muted)]">
          {item.registrationNumber && <span className="tabular">№ {item.registrationNumber}</span>}
          {prefix && <span className="inline-flex items-center gap-1">{prefix} {(item.responseFromName ?? item.creatorName) && <UserAvatar name={(item.responseFromName ?? item.creatorName)!} avatarUrl={item.avatarUrl} size="xs" clickable={false} />}{item.responseFromName ?? item.creatorName}</span>}
        </div>
      </div>
      <DeadlineCountdown deadline={item.deadline} />
      <ChevronRight className="size-4 text-[var(--subtle)] group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

function DeadlineRequestRow({ item, text, chip }: { item: DeadlineRequestInboxItem; text: string; chip: string }) {
  return (
    <Link
      href={`/tasks/${item.taskId}`}
      className="group flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[var(--surface-3)] transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold truncate">{item.title}</p>
        <div className="flex min-w-0 items-center gap-2 mt-1 text-[13px] text-[var(--muted)]">
          {item.registrationNumber && <span className="tabular shrink-0">№ {item.registrationNumber}</span>}
          <UserAvatar name={item.requesterName} avatarUrl={item.avatarUrl} size="xs" clickable={false} />
          <span className="min-w-0 truncate">{text}</span>
        </div>
      </div>
      <StatusTag tone="amber" size="sm" className="shrink-0">{chip}</StatusTag>
      <ChevronRight className="size-4 shrink-0 text-[var(--subtle)] group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

export async function InboxWidget({ userId }: { userId: string }) {
  const t = await getTranslations();
  const [pendingApproval, myActive, deadlineRequests] = await Promise.all([
    inboxAwaitingMyApproval(userId),
    inboxMyActive(userId),
    inboxDeadlineRequests(userId),
  ]);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-[var(--warning-soft)] flex items-center justify-center">
              <ClipboardCheck className="size-5 text-[var(--warning)]" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">{t("inbox.awaitingApproval")}</h3>
              <p className="text-sm text-[var(--muted)]">{t("inbox.approvalDescription")}</p>
            </div>
          </div>
          <span className="text-xl font-bold tabular">{pendingApproval.length + deadlineRequests.length}</span>
        </div>
        <div className="px-2 py-2 space-y-0.5">
          {deadlineRequests.slice(0, 5).map((item) => (
            <DeadlineRequestRow
              key={item.requestId}
              item={item}
              text={t("staffX.taskEdit.inboxRow", { name: shortName(item.requesterName), days: item.extraDays })}
              chip={t("staffX.taskEdit.fieldDeadline")}
            />
          ))}
          {pendingApproval.length === 0 && deadlineRequests.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <CheckCircle2 className="size-8 text-[var(--success)] mx-auto mb-2" />
              <p className="text-sm text-[var(--muted)]">{t("inbox.noResponses")}</p>
            </div>
          ) : (
            pendingApproval.slice(0, 6).map((item) => (
              <Row key={item.id + (item.responseFromName ?? "")} item={item} prefix={t("inbox.responsePrefix")} />
            ))
          )}
        </div>
      </Card>

      <Card>
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center">
              <ListTodo className="size-5 text-[var(--primary)]" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">{t("inbox.myTasks")}</h3>
              <p className="text-sm text-[var(--muted)]">{t("inbox.myTasksDescription")}</p>
            </div>
          </div>
          <span className="text-xl font-bold tabular">{myActive.length}</span>
        </div>
        <div className="px-2 py-2 space-y-0.5">
          {myActive.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <CheckCircle2 className="size-8 text-[var(--success)] mx-auto mb-2" />
              <p className="text-sm text-[var(--muted)]">{t("inbox.allComplete")} 🎉</p>
            </div>
          ) : (
            myActive.slice(0, 6).map((item) => (
              <Row key={item.id} item={item} prefix={t("inbox.assignedPrefix")} />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
