import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import {
  IconAlertTriangle,
  IconCalendarDue,
  IconCalendarEvent,
  IconChevronRight,
  IconClockHour4,
  IconSunrise,
  IconInbox,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { DeadlineCountdown } from "@/components/tasks/deadline-countdown";
import { BUCKET_ORDER, endOfTashkentDay, type Bucket } from "@/lib/my-work/buckets";
import { cn } from "@/lib/utils";
import type { AgendaItem } from "@/server/queries/my-work";
import { KIND_ICON, KIND_TONE, KindChip, shortDate } from "./kind-meta";
import { TodoRow } from "./todo-row";

const BUCKET_STYLE: Record<Bucket, { icon: TablerIcon; head: string; box: string; badge: string }> = {
  overdue: {
    icon: IconAlertTriangle,
    head: "text-[var(--danger)]",
    box: "bg-[var(--danger-soft)] text-[var(--danger)]",
    badge: "bg-[var(--danger)] text-white",
  },
  today: {
    icon: IconSunrise,
    head: "text-[var(--primary)]",
    box: "bg-[var(--primary-soft)] text-[var(--primary)]",
    badge: "bg-[var(--primary)] text-[var(--primary-foreground)]",
  },
  tomorrow: {
    icon: IconCalendarDue,
    head: "text-[var(--warning)]",
    box: "bg-[var(--warning-soft)] text-[var(--warning)]",
    badge: "bg-[var(--warning)] text-white",
  },
  week: {
    icon: IconCalendarEvent,
    head: "text-[var(--foreground)]",
    box: "bg-[var(--surface-3)] text-[var(--muted)]",
    badge: "bg-[var(--surface-3)] text-[var(--muted)]",
  },
  later: {
    icon: IconClockHour4,
    head: "text-[var(--foreground)]",
    box: "bg-[var(--surface-3)] text-[var(--muted)]",
    badge: "bg-[var(--surface-3)] text-[var(--muted)]",
  },
  nodate: {
    icon: IconInbox,
    head: "text-[var(--foreground)]",
    box: "bg-[var(--surface-3)] text-[var(--muted)]",
    badge: "bg-[var(--surface-3)] text-[var(--muted)]",
  },
};

/** Teskari sanoq faqat haqiqiy muddati bor turlar uchun (tasdiqlash/koʻrib chiqish — "hozir"). */
function countdownTarget(item: AgendaItem): string | null {
  if (item.done || !item.date) return null;
  if (item.kind === "approval" || item.kind === "review" || item.kind === "studio_request") return null;
  // Kengash: faqat aniq vaqti boʻlgan va hali boshlanmagan majlis uchun.
  if (item.kind === "council") return item.at ?? null;
  return endOfTashkentDay(item.date);
}

function AgendaRow({ item, kindLabel, dateLabel }: { item: AgendaItem; kindLabel: string; dateLabel: string | null }) {
  const Icon = KIND_ICON[item.kind];
  const target = countdownTarget(item);
  const body = (
    <>
      <span className={cn("mt-0.5 hidden size-9 shrink-0 items-center justify-center rounded-xl sm:flex", KIND_TONE[item.kind])}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-[15px] font-semibold leading-snug transition-colors group-hover:text-[var(--primary)]">
          {item.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--muted)]">
          <KindChip kind={item.kind} label={kindLabel} />
          {dateLabel && <span className="shrink-0 font-medium tabular">{dateLabel}</span>}
          {item.sub && <span className="min-w-0 max-w-full break-words">{item.sub}</span>}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 self-center">
        {target && <DeadlineCountdown deadline={target} />}
        {item.href && (
          <IconChevronRight
            className="hidden size-4 text-[var(--subtle)] transition-transform group-hover:translate-x-0.5 sm:block"
            aria-hidden
          />
        )}
      </span>
    </>
  );

  return (
    <li>
      {item.href ? (
        <Link
          href={item.href}
          className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[var(--surface-2)] sm:px-3"
        >
          {body}
        </Link>
      ) : (
        <div className="group flex items-start gap-3 rounded-xl px-2 py-2.5 sm:px-3">{body}</div>
      )}
    </li>
  );
}

/** Kun tartibi boʻlimlari: muddati oʻtgan → bugun → ertaga → shu hafta → keyinroq → sanasiz. Boʻsh boʻlimlar yashiriladi. */
export async function AgendaBuckets({ items, locale, today }: { items: AgendaItem[]; locale: string; today: string }) {
  const t = await getTranslations({ locale, namespace: "staffX.myWork" });
  const year = today.slice(0, 4);
  const groups = BUCKET_ORDER.map((b) => ({ bucket: b, list: items.filter((i) => i.bucket === b) })).filter(
    (g) => g.list.length > 0,
  );

  return (
    <div className="space-y-4">
      {groups.map(({ bucket, list }) => {
        const s = BUCKET_STYLE[bucket];
        const BIcon = s.icon;
        const open = list.filter((i) => !i.done).length;
        // "Bugun"/"Ertaga" boʻlimlarida sana takrorlanmaydi.
        const showDate = bucket !== "today" && bucket !== "tomorrow" && bucket !== "nodate";
        return (
          <Card key={bucket} className="overflow-hidden">
            <section aria-labelledby={`bucket-${bucket}`}>
              <header className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-3 sm:px-5">
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", s.box)}>
                  <BIcon className="size-[18px]" aria-hidden />
                </span>
                <h2 id={`bucket-${bucket}`} className={cn("min-w-0 flex-1 truncate text-base font-bold tracking-tight", s.head)}>
                  {t(`bucket.${bucket}`)}
                </h2>
                {open > 0 && (
                  <span className={cn("rounded-full px-2 text-xs font-bold leading-6 tabular", s.badge)}>{open}</span>
                )}
              </header>
              <ul className="space-y-0.5 p-1.5 sm:p-2">
                {list.map((item) =>
                  item.kind === "todo" ? (
                    <TodoRow
                      key={item.key}
                      today={today}
                      item={{
                        id: item.id,
                        title: item.title,
                        sub: item.sub,
                        href: item.href,
                        date: item.date,
                        done: item.done,
                        note: item.todo?.note ?? null,
                      }}
                    />
                  ) : (
                    <AgendaRow
                      key={item.key}
                      item={item}
                      kindLabel={t(`kind.${item.kind}`)}
                      dateLabel={showDate && item.date ? shortDate(item.date, locale, year) : null}
                    />
                  ),
                )}
              </ul>
            </section>
          </Card>
        );
      })}
    </div>
  );
}
