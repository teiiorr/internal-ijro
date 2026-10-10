"use client";
import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconLoader2, IconCheck, IconLock, IconEyeOff, IconListCheck, IconClock } from "@tabler/icons-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Status } from "@/components/ui-biib/Status";
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

/** Soʻrovnoma xususiyati — kapsulasiz, oddiy --ink-2 matn + mayda belgi. */
function Facet({ icon: Icon, children }: { icon: typeof IconEyeOff; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

/**
 * Soʻrovnoma: radio/checkbox variantlar (ajratuvchi roʻyxat, quti emas) + "Ovoz berish".
 * Ovoz berilgach yoki soʻrovnoma yopilgach natijalar bar-diagrammada (foizlar bilan).
 * Yopilguncha "Ovozni oʻzgartirish". Ochiq soʻrovnomada har variant ostida ovoz berganlar.
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
    <div className="min-w-0 space-y-5">
      <div className="min-w-0 space-y-2">
        <h2 className="break-words font-[family-name:var(--font-ui)] text-[1.0625rem] font-bold tracking-tight text-[var(--ink)] sm:text-[1.1875rem]">
          {poll.question}
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 t-small text-[var(--ink-2)]">
          {poll.anonymous && <Facet icon={IconEyeOff}>{t("anonymousBadge")}</Facet>}
          {poll.multi && <Facet icon={IconListCheck}>{t("multiBadge")}</Facet>}
          {poll.closed ? (
            <Status tone="danger">
              <IconLock className="size-3.5" aria-hidden />
              {t("pollClosed")}
            </Status>
          ) : poll.closesAt ? (
            <Facet icon={IconClock}>{t("closesOn", { date: formatDate(poll.closesAt, locale) })}</Facet>
          ) : null}
        </div>
      </div>

      {voting && (
        <form onSubmit={submit} className="space-y-4">
          <fieldset>
            <legend className="sr-only">{poll.question}</legend>
            <ul className="divide-y divide-[var(--line)]">
              {poll.options.map((o) => {
                const checked = selected.includes(o.id);
                return (
                  <li key={o.id}>
                    <label
                      className={cn(
                        "flex min-w-0 cursor-pointer items-center gap-3 py-3 transition-colors",
                        checked ? "text-[var(--ink)]" : "text-[var(--ink-2)] hover:text-[var(--ink)]",
                      )}
                    >
                      <input
                        type={poll.multi ? "checkbox" : "radio"}
                        name={`poll-${announcementId}`}
                        value={o.id}
                        checked={checked}
                        onChange={() => pick(o.id)}
                        className="size-4 shrink-0 accent-[var(--tint)]"
                      />
                      <span
                        className={cn("min-w-0 flex-1 break-words text-[0.9375rem]", checked ? "font-semibold" : "font-medium")}
                      >
                        {o.label}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
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
          <div className="flex flex-wrap items-center justify-between gap-2 t-small text-[var(--ink-2)]">
            <span className="font-semibold text-[var(--ink)]">{t("pollResults")}</span>
            <span className="tabular-nums text-[var(--ink-3)]">{t("votersCount", { count: poll.totalVoters })}</span>
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
            <p className="flex items-center gap-1.5 t-small font-medium text-[var(--ink-2)]">
              <span aria-hidden className="size-2.5 rounded-sm bg-[var(--success)]" />
              {t("yourChoice")}
            </p>
          )}

          {hasVoterLists && (
            <ul className="space-y-2.5 border-t border-[var(--line)] pt-3">
              {poll.options.map((o) => (
                <li key={o.id} className="min-w-0">
                  <p className="break-words text-[0.9375rem] font-semibold text-[var(--ink)]">
                    {o.label}{" "}
                    <span className="font-medium text-[var(--ink-3)]">, {t("votes", { count: o.votes })}</span>
                  </p>
                  <p className="mt-0.5 break-words t-small leading-relaxed text-[var(--ink-3)]">
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
