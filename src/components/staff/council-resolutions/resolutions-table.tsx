"use client";
import { useLocale, useTranslations } from "next-intl";
import { IconClipboardList as ClipboardList, IconGavel as Gavel } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/components/ui/user-avatar";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import type { RowPermissions } from "@/lib/councils/resolution-status";
import type { ResolutionRow } from "@/server/queries/council-resolutions";
import { DueCell, ExpandableText, KindChip, NS, ResolutionStatusChip, fmtDay } from "./shared";
import { ResolutionRowActions } from "./row-actions";

export type TableRow = ResolutionRow & { perms: RowPermissions };

const TABLE_ACTIONS: Array<"send" | "close"> = ["send", "close"];

/**
 * /kengashlar/ijro list. md+ → table (horizontal scroll inside the card); below md →
 * stacked cards. Overdue rows are tinted; row actions: close (with note) and send as task.
 */
export function ResolutionsTable({ rows }: { rows: TableRow[] }) {
  const t = useTranslations(NS);
  const tg = useTranslations();
  const locale = useLocale();

  if (rows.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
        <Gavel className="size-8 text-[var(--subtle)]" />
        <p className="text-sm font-medium text-[var(--muted)]">{t("empty")}</p>
      </div>
    );
  }

  return (
    <>
      {/* md+ : table */}
      <div className="glass-card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                <th className="w-40 px-4 py-3">{t("meeting")}</th>
                <th className="w-12 px-2 py-3">№</th>
                <th className="px-3 py-3">{t("text")}</th>
                <th className="w-48 px-3 py-3">{t("responsible")}</th>
                <th className="w-40 px-3 py-3">{t("dueDate")}</th>
                <th className="w-32 px-3 py-3">{tg("common.status")}</th>
                <th className="w-36 px-3 py-3">{t("task")}</th>
                <th className="w-56 px-4 py-3 text-right">{tg("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={cn(
                    "border-b border-[var(--border)] align-top last:border-b-0",
                    r.effective === "overdue" && "bg-[var(--danger-soft)]",
                    r.effective === "cancelled" && "opacity-70"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <Link href={`/kengashlar/${r.meetingKind}`} className="max-w-full hover:opacity-80">
                        <KindChip kind={r.meetingKind} />
                      </Link>
                      <span className="whitespace-nowrap text-xs font-medium tabular-nums text-[var(--muted)]">
                        {fmtDay(r.meetingDate, locale)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3 font-bold tabular-nums text-[var(--muted)]">{r.number}</td>
                  <td className="px-3 py-3">
                    <ExpandableText text={r.text} className={cn("font-medium", r.effective === "cancelled" && "line-through")} />
                    {r.agendaTopic && <p className="mt-1 line-clamp-1 break-words text-xs text-[var(--muted)]">{r.agendaTopic}</p>}
                    {r.closedNote && (
                      <p className="mt-1 break-words text-xs text-[var(--muted)]">
                        <span className="font-semibold">{t("closedNote")}:</span> {r.closedNote}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Responsible row={r} locale={locale} empty={t("noResponsible")} />
                  </td>
                  <td className="px-3 py-3">
                    <DueCell dueDate={r.dueDate} effective={r.effective} />
                  </td>
                  <td className="px-3 py-3">
                    <ResolutionStatusChip status={r.effective} />
                  </td>
                  <td className="px-3 py-3">
                    <TaskLink row={r} />
                  </td>
                  <td className="px-4 py-3">
                    <ResolutionRowActions row={r} perms={r.perms} only={TABLE_ACTIONS} className="flex flex-wrap justify-end gap-1.5" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* < md : cards */}
      <ul className="space-y-2.5 md:hidden">
        {rows.map((r) => (
          <li
            key={r.id}
            className={cn(
              "glass-card min-w-0 space-y-2.5 p-3.5",
              r.effective === "overdue" && "!bg-[var(--danger-soft)]",
              r.effective === "cancelled" && "opacity-70"
            )}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Link href={`/kengashlar/${r.meetingKind}`} className="min-w-0 max-w-full">
                <KindChip kind={r.meetingKind} />
              </Link>
              <span className="text-xs font-medium tabular-nums text-[var(--muted)]">{fmtDay(r.meetingDate, locale)}</span>
              <span className="text-xs font-bold tabular-nums text-[var(--muted)]">№{r.number}</span>
              <ResolutionStatusChip status={r.effective} className="ml-auto" />
            </div>
            <ExpandableText text={r.text} className={cn("text-sm font-medium", r.effective === "cancelled" && "line-through")} />
            {r.agendaTopic && <p className="line-clamp-2 break-words text-xs text-[var(--muted)]">{r.agendaTopic}</p>}
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <Responsible row={r} locale={locale} empty={t("noResponsible")} />
              <DueCell dueDate={r.dueDate} effective={r.effective} />
              <TaskLink row={r} />
            </div>
            {r.closedNote && (
              <p className="break-words text-xs text-[var(--muted)]">
                <span className="font-semibold">{t("closedNote")}:</span> {r.closedNote}
              </p>
            )}
            <ResolutionRowActions row={r} perms={r.perms} only={TABLE_ACTIONS} />
          </li>
        ))}
      </ul>
    </>
  );
}

function Responsible({ row, locale, empty }: { row: ResolutionRow; locale: string; empty: string }) {
  if (!row.responsibleName) return <span className="text-sm text-[var(--subtle)]">{empty}</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <UserAvatar name={row.responsibleName} avatarUrl={row.responsibleAvatar} size="xs" clickable={false} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{localizeName(row.responsibleName, locale)}</span>
        {row.departmentName && <span className="block truncate text-xs text-[var(--muted)]">{row.departmentName}</span>}
      </span>
    </span>
  );
}

function TaskLink({ row }: { row: ResolutionRow }) {
  if (!row.taskId) return <span className="text-sm text-[var(--subtle)]">—</span>;
  return (
    <Link
      href={`/tasks/${row.taskId}`}
      className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-[var(--primary)] hover:underline"
    >
      <ClipboardList className="size-4" />№ {row.taskRegNumber ?? "—"}
    </Link>
  );
}
