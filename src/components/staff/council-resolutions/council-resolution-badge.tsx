import { getTranslations } from "next-intl/server";
import { IconGavel as Gavel } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { getResolutionsForTask } from "@/server/queries/council-resolutions";
import { ddmmyyyy, isCouncilKind, tashkentDateOf } from "@/lib/councils/resolution-status";

/**
 * Task page chip: "Kengash qarori asosida: Smeta komissiyasi, 12.09.2026, №3" → /kengashlar/:kind.
 * Renders nothing when the task was not created from a council resolution (or before 0031).
 */
export async function CouncilResolutionBadge({ taskId }: { taskId: string }) {
  const rows = await getResolutionsForTask(taskId);
  if (rows.length === 0) return null;
  const t = await getTranslations("staffX.councilResolutions");

  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {rows.map((r) => (
        <Link
          key={`${r.meetingId}-${r.number}`}
          href={`/kengashlar/${r.meetingKind}`}
          className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)] transition-colors hover:border-[var(--primary)]/60 sm:text-sm"
        >
          <Gavel className="size-4 shrink-0" />
          <span className="min-w-0 break-words">
            {t("basedOn", {
              kind: isCouncilKind(r.meetingKind) ? t(r.meetingKind) : r.meetingKind,
              date: ddmmyyyy(tashkentDateOf(r.meetingDate)),
              number: r.number,
            })}
          </span>
        </Link>
      ))}
    </div>
  );
}
