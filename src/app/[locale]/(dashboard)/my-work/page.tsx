import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { IconCalendarOff, IconConfetti } from "@tabler/icons-react";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/dates";
import { countByDay, isIsoDate } from "@/lib/my-work/buckets";
import { cn } from "@/lib/utils";
import { AGENDA_KINDS, getMyAgenda, type AgendaKind } from "@/server/queries/my-work";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { WeekStrip } from "@/components/staff/my-work/week-strip";
import { TodoQuickAdd } from "@/components/staff/my-work/todo-quick-add";
import { AgendaBuckets } from "@/components/staff/my-work/agenda-buckets";
import { KIND_ICON } from "@/components/staff/my-work/kind-meta";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function MyWorkPage({ searchParams }: { searchParams: SP }) {
  const me = await requireUser();
  const locale = await getLocale();
  const t = await getTranslations("staffX.myWork");
  const tc = await getTranslations("common");
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const rawDay = get("day");
  const day = isIsoDate(rawDay) ? rawDay : null;
  const rawKind = get("kind");
  const kind = rawKind && (AGENDA_KINDS as string[]).includes(rawKind) ? (rawKind as AgendaKind) : null;

  const { items, today, week } = await getMyAgenda(me.id, locale);

  // Filtrlash tartibi: tur → (kunlik hisob) → kun. Hisoblagichlar faqat ochiq ishlarni sanaydi.
  const byKind = kind ? items.filter((i) => i.kind === kind) : items;
  const counts = countByDay(byKind.filter((i) => !i.done), week);
  const visible = day ? byKind.filter((i) => i.date === day) : byKind;

  const kindCounts = new Map<AgendaKind, number>();
  for (const i of items) if (!i.done) kindCounts.set(i.kind, (kindCounts.get(i.kind) ?? 0) + 1);
  const kindTabs = AGENDA_KINDS.filter((k) => kindCounts.has(k) || k === kind);

  const href = (k: AgendaKind | null) => {
    const p = new URLSearchParams();
    if (k) p.set("kind", k);
    if (day) p.set("day", day);
    const q = p.toString();
    return q ? `/my-work?${q}` : "/my-work";
  };

  const fullyEmpty = items.length === 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm font-medium text-[var(--muted)]">{t("subtitle")}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-[var(--muted)] tabular sm:text-base">
          {tc("today")}, {formatDate(`${today}T12:00:00+05:00`, locale)}
        </p>
      </div>

      <WeekStrip days={week} counts={counts} selected={day} today={today} kind={kind} />

      {kindTabs.length > 1 && (
        <nav
          aria-label={tc("type")}
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-thin"
        >
          <Link
            href={href(null)}
            scroll={false}
            replace
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
              !kind
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            {tc("all")}
          </Link>
          {kindTabs.map((k) => {
            const Icon = KIND_ICON[k];
            const active = kind === k;
            const n = kindCounts.get(k) ?? 0;
            return (
              <Link
                key={k}
                href={href(active ? null : k)}
                scroll={false}
                replace
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {t(`kind.${k}`)}
                {n > 0 && <span className="tabular opacity-80">{n}</span>}
              </Link>
            );
          })}
        </nav>
      )}

      <Card>
        <CardContent className="p-4 sm:p-5">
          <TodoQuickAdd key={day ?? "all"} defaultDate={day} />
        </CardContent>
      </Card>

      {fullyEmpty ? (
        <Card>
          <EmptyState icon={IconConfetti} title={t("empty")} />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={IconCalendarOff}
            title={t("emptyFiltered")}
            action={
              <Link
                href="/my-work"
                scroll={false}
                replace
                className="inline-flex items-center rounded-full bg-[var(--primary-soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary-soft-strong)]"
              >
                {t("clearFilters")}
              </Link>
            }
          />
        </Card>
      ) : (
        <AgendaBuckets items={visible} locale={locale} today={today} />
      )}
    </div>
  );
}
