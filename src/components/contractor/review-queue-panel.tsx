import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { IconInbox as Inbox, IconChevronRight as Chevron } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { SmoothImage } from "@/components/ui/smooth-image";
import { formatDate } from "@/lib/dates";

type Stage = { stageId: string; projectId: string; projectName: string; stageName: string; submittedAt: Date | string | null; submittedByName: string | null };
type Group = { studioId: string; studioName: string; studioLogo: string | null; oldestSubmittedAt: Date | string | null; stages: Stage[] };

/** "Sizni kutmoqda" — BKRM körigini kutayotgan barcha studiya topşiriqlari, eng eskisi birinchi.
 *  Navbat boş bölsa yaşiriladi. Qatorlar studiya köriş iş maydoniga deep-link qiladi. */
export async function ReviewQueuePanel({ groups }: { groups: Group[] }) {
  if (groups.length === 0) return null;
  const t = await getTranslations();
  const locale = await getLocale();
  const total = groups.reduce((n, g) => n + g.stages.length, 0);

  return (
    <Card className="border-[var(--warning)]/45">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--warning)]/15 text-[var(--warning)]">
            <Inbox className="size-5" />
          </div>
          <h2 className="text-base font-bold sm:text-lg">{t("contractors.reviewQueue.title")}</h2>
          <StatusTag tone="amber" size="sm" className="ml-auto">{total}</StatusTag>
        </div>

        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.studioId} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-md bg-[var(--surface-2)]">
                  {g.studioLogo ? <SmoothImage src={g.studioLogo} alt={g.studioName} className="size-full object-contain" /> : <span className="text-[10px] font-black text-[var(--subtle)]">{g.studioName.trim().charAt(0).toUpperCase()}</span>}
                </div>
                <span className="truncate text-sm font-semibold">{g.studioName}</span>
                <span className="text-xs text-[var(--muted)]">· {g.stages.length}</span>
              </div>
              <div className="space-y-1.5">
                {g.stages.map((s) => (
                  <Link
                    key={s.stageId}
                    href={`/contractors/${g.studioId}?review=${s.projectId}`}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm transition-colors hover:border-[var(--primary)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{s.projectName} <span className="text-[var(--muted)]">· {s.stageName}</span></p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {s.submittedAt ? `${t("contractors.reviewQueue.submitted")} ${formatDate(s.submittedAt, locale)}` : ""}
                        {s.submittedByName ? ` · ${s.submittedByName}` : ""}
                      </p>
                    </div>
                    <Chevron className="size-4 shrink-0 text-[var(--subtle)]" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
