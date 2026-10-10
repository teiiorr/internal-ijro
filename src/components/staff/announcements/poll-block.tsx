"use client";
import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconChartBar, IconLoader2, IconCheck, IconLock, IconEyeOff, IconListCheck, IconClock } from "@tabler/icons-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { votePoll } from "@/server/actions/announcements";
import type { AnnouncementPoll } from "@/server/queries/announcements";
import { errorKey, percent } from "./logic";

// recharts ogʻir — natija koʻrinishiga kelgandagina, faqat mijozda yuklanadi.
const PollChart = dynamic(() => import("./poll-chart").then((m) => m.PollChart), {
  ssr: false,
  loading: () => <div className="h-32 w-full rounded-xl skeleton-shimmer" />,
});

function Chip({ icon, children, tone = "muted" }: { icon: React.ReactNode; children: React.ReactNode; tone?: "muted" | "danger" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold",
        tone === "danger" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--surface-2)] text-[var(--muted)]"
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/**
 * Soʻrovnoma: radio/checkbox variantlar + "Ovoz berish". Ovoz berilgach yoki soʻrovnoma
 * yopilgach natijalar bar-diagrammada (foizlar bilan). Yopilguncha "Ovozni oʻzgartirish".
 * Ochiq soʻrovnomada (server ruxsat bergan boʻlsa) har variant ostida ovoz berganlar ismlari.
 */
export function PollBlock({
  announcementId,
  poll,
  showResultsAlways = false,
}: {
  announcementId: string;
  poll: AnnouncementPoll;
  /** Muallif natijalarni ovoz bermasdan ham koʻradi. */
  showResultsAlways?: boolean;
}) {
  const t = useTranslations("staffX.announcements");
  const tr = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string[]>(poll.myOptionIds);
  const [editing, setEditing] = useState(false);

  const hasVoted = poll.myOptionIds.length > 0;
  const voting = !poll.closed && (!hasVoted || editing);
  const showResults = !voting || showResultsAlways;
  const mine = new Set(poll.myOptionIds);
  const hasVoterLists = !poll.anonymous && poll.options.some((o) => o.voters !== undefined);

  function pick(id: string) {
    if (poll.multi) setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    else setSelected([id]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0) {
      toast.error(t("errors.noOption"));
      return;
    }
    start(async () => {
      try {
        const res = await votePoll({ announcementId, optionIds: selected });
        if (!res.ok) {
          toast.error(t(errorKey(res.error)));
          if (res.error === "poll_closed") router.refresh();
          return;
        }
        toast.success(t("voted"));
        setEditing(false);
        router.refresh();
      } catch {
        toast.error(t("errors.generic"));
      }
    });
  }

  const data = poll.options.map((o) => ({
    id: o.id,
    label: o.label,
    votes: o.votes,
    pct: percent(o.votes, poll.totalVoters),
    mine: mine.has(o.id),
  }));

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            <IconChartBar className="size-4" aria-hidden />
            {t("poll")}
          </p>
          <h2 className="mt-1 break-words text-lg font-bold tracking-tight">{poll.question}</h2>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {poll.anonymous && <Chip icon={<IconEyeOff className="size-3.5" />}>{t("anonymousBadge")}</Chip>}
          {poll.multi && <Chip icon={<IconListCheck className="size-3.5" />}>{t("multiBadge")}</Chip>}
          {poll.closed ? (
            <Chip icon={<IconLock className="size-3.5" />} tone="danger">
              {t("pollClosed")}
            </Chip>
          ) : poll.closesAt ? (
            <Chip icon={<IconClock className="size-3.5" />}>{t("closesOn", { date: formatDate(poll.closesAt, locale) })}</Chip>
          ) : null}
        </div>
      </div>

      {voting && (
        <form onSubmit={submit} className="space-y-3">
          <fieldset className="space-y-2">
            <legend className="sr-only">{poll.question}</legend>
            {poll.options.map((o) => {
              const checked = selected.includes(o.id);
              return (
                <label
                  key={o.id}
                  className={cn(
                    "flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                    checked
                      ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                      : "border-[var(--border)] hover:bg-[var(--surface-2)]"
                  )}
                >
                  <input
                    type={poll.multi ? "checkbox" : "radio"}
                    name={`poll-${announcementId}`}
                    value={o.id}
                    checked={checked}
                    onChange={() => pick(o.id)}
                    className="size-4 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1 break-words text-sm font-medium">{o.label}</span>
                </label>
              );
            })}
          </fieldset>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setSelected(poll.myOptionIds);
                }}
              >
                {tr("common.cancel")}
              </Button>
            )}
            <Button type="submit" disabled={pending || selected.length === 0}>
              {pending ? <IconLoader2 className="size-4 animate-spin" /> : <IconCheck className="size-4" />}
              {t("vote")}
            </Button>
          </div>
        </form>
      )}

      {showResults && (
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
            <span className="font-bold uppercase tracking-wider">{t("pollResults")}</span>
            <span className="font-semibold tabular-nums">{t("votersCount", { count: poll.totalVoters })}</span>
          </div>

          <div aria-hidden>
            <PollChart data={data} />
          </div>
          {/* Ekran oʻqigichlar uchun matnli natijalar */}
          <ul className="sr-only">
            {data.map((d) => (
              <li key={d.id}>
                {d.label}: {d.pct}% ({t("votes", { count: d.votes })}){d.mine ? ` — ${t("yourChoice")}` : ""}
              </li>
            ))}
          </ul>

          {hasVoted && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
              <span aria-hidden className="size-2.5 rounded-sm bg-[#10B981]" />
              {t("yourChoice")}
            </p>
          )}

          {hasVoterLists && (
            <ul className="space-y-2.5 border-t border-[var(--border)] pt-3">
              {poll.options.map((o) => (
                <li key={o.id} className="min-w-0">
                  <p className="break-words text-sm font-semibold">
                    {o.label}{" "}
                    <span className="font-medium text-[var(--muted)]">· {t("votes", { count: o.votes })}</span>
                  </p>
                  <p className="mt-0.5 break-words text-xs leading-relaxed text-[var(--muted)]">
                    {o.voters && o.voters.length > 0 ? o.voters.map((n) => localizeName(n, locale)).join(", ") : "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {!poll.closed && hasVoted && !editing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelected(poll.myOptionIds);
                setEditing(true);
              }}
            >
              {t("changeVote")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
