"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  IconGavel as Gavel,
  IconInfoCircle as InfoCircle,
  IconListDetails as ListDetails,
  IconClipboardList as ClipboardList,
} from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import type { PickerPerson } from "@/components/ui/employee-picker";
import { UserAvatar } from "@/components/ui/user-avatar";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { isActiveStatus, rowPermissions } from "@/lib/councils/resolution-status";
import type { ResolutionRow } from "@/server/queries/council-resolutions";
import { DueCell, ExpandableText, NS, ResolutionStatusChip } from "./shared";
import { ResolutionRowActions } from "./row-actions";
import { AddResolutionForm, EditResolutionDialog, type AgendaOption } from "./resolution-form";

/**
 * "Qaror bandlari" block of one meeting: the numbered list of points with their
 * actions, plus the add form (collapsed in `compact` mode, used for past meetings).
 */
export function ResolutionsEditor({
  meetingId,
  kind,
  rows,
  agendaItems,
  people,
  canEdit,
  canAssign,
  compact = false,
  me,
}: {
  meetingId: string;
  kind: string;
  rows: ResolutionRow[];
  agendaItems: AgendaOption[];
  people: PickerPerson[];
  canEdit: boolean;
  canAssign: boolean;
  compact?: boolean;
  /** Current user — the responsible person may close their own point. */
  me: { id: string; position: string };
}) {
  const t = useTranslations(NS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = editingId ? rows.find((r) => r.id === editingId) : undefined;

  return (
    <section className={cn("min-w-0 space-y-3", !compact && "border-t border-[var(--border)] pt-5")} data-kind={kind}>
      <div className="flex min-w-0 items-center gap-2">
        <Gavel className="size-4 shrink-0 text-[var(--primary)]" />
        <h3 className="min-w-0 truncate text-base font-semibold">{t("block")}</h3>
        {rows.length > 0 && (
          <span className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-xs font-bold tabular-nums text-[var(--muted)]">
            {rows.length}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t("empty")}</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((row) => (
            <EditorItem
              key={row.id}
              row={row}
              perms={rowPermissions(row, me, canEdit, canAssign)}
              onEdit={() => setEditingId(row.id)}
            />
          ))}
        </ol>
      )}

      {canEdit && <AddResolutionForm meetingId={meetingId} agendaItems={agendaItems} people={people} collapsible={compact} />}

      {!compact && canEdit && rows.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-[var(--subtle)]">
          <InfoCircle className="mt-px size-3.5 shrink-0" />
          <span className="min-w-0 break-words">{t("deleteMeetingNote")}</span>
        </p>
      )}

      {editing && (
        <EditResolutionDialog row={editing} agendaItems={agendaItems} people={people} onDone={() => setEditingId(null)} />
      )}
    </section>
  );
}

function EditorItem({
  row,
  perms,
  onEdit,
}: {
  row: ResolutionRow;
  perms: ReturnType<typeof rowPermissions>;
  onEdit: () => void;
}) {
  const t = useTranslations(NS);
  const locale = useLocale();
  const overdue = row.effective === "overdue";
  const closed = !isActiveStatus(row.effective);

  return (
    <li
      className={cn(
        "rounded-xl border p-3 sm:p-3.5",
        overdue ? "border-[var(--danger)]/30 bg-[var(--danger-soft)]" : "border-[var(--border)] bg-[var(--surface-2)]",
        row.effective === "cancelled" && "opacity-70"
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
        <span className="mt-0.5 shrink-0 rounded-lg bg-[var(--card)] px-1.5 py-0.5 text-xs font-bold tabular-nums text-[var(--muted)] shadow-[var(--shadow-1)]">
          №{row.number}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <ExpandableText text={row.text} className={cn("text-sm font-medium", row.effective === "cancelled" && "line-through")} />

          {row.agendaTopic && (
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--muted)]">
              <ListDetails className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate">{row.agendaTopic}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            {row.responsibleName ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <UserAvatar name={row.responsibleName} avatarUrl={row.responsibleAvatar} size="xs" clickable={false} className="!size-6" />
                <span className="min-w-0 truncate font-semibold">{localizeName(row.responsibleName, locale)}</span>
              </span>
            ) : (
              <span className="text-[var(--subtle)]">{t("noResponsible")}</span>
            )}
            <DueCell dueDate={row.dueDate} effective={row.effective} />
            <ResolutionStatusChip status={row.effective} />
            {row.taskId && (
              <Link
                href={`/tasks/${row.taskId}`}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md text-xs font-semibold text-[var(--primary)] hover:underline"
              >
                <ClipboardList className="size-3.5" />№ {row.taskRegNumber ?? "—"}
              </Link>
            )}
          </div>

          {row.closedNote && (
            <p className="break-words text-xs text-[var(--muted)]">
              <span className="font-semibold">{t("closedNote")}:</span> {row.closedNote}
            </p>
          )}

          {row.taskId && !closed && (
            <p className="flex items-start gap-1.5 text-xs text-[var(--subtle)]">
              <InfoCircle className="mt-px size-3.5 shrink-0" />
              <span className="min-w-0 break-words">{t("taskLinkedCannotClose")}</span>
            </p>
          )}

          <ResolutionRowActions row={row} perms={perms} onEdit={onEdit} />
        </div>
      </div>
    </li>
  );
}
