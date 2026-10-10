import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { IconCalendarOff, IconConfetti } from "@tabler/icons-react";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Card } from "@/components/ui-biib/Card";
import { Button } from "@/components/ui-biib/Button";
import { requireUser } from "@/lib/session";
import { countByDay, isIsoDate } from "@/lib/my-work/buckets";
import { cn } from "@/lib/utils";
import { AGENDA_KINDS, getMyAgenda, type AgendaKind } from "@/server/queries/my-work";
import { EmptyState } from "@/components/empty-state";
import { WeekStrip } from "@/components/staff/my-work/week-strip";
import { TodoQuickAdd } from "@/components/staff/my-work/todo-quick-add";
import { AgendaBuckets } from "@/components/staff/my-work/agenda-buckets";
import { KIND_ICON, shortDate } from "@/components/staff/my-work/kind-meta";

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

  const tabClass = (active: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-s)] px-3 py-2 t-label transition-colors",
      active
        ? "bg-[color-mix(in_oklab,var(--tint)_12%,transparent)] text-[var(--tint)]"
        : "text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
    );

  const fullyEmpty = items.length === 0;

  return (
    <div>
      <PageHeader title={t("title")} subtitle={`${tc("today")}, ${shortDate(today, locale, today.slice(0, 4))}`} />

      <div className="flex min-w-0 flex-col gap-8 lg:gap-12">
        <div className="space-y-3">
          <WeekStrip days={week} counts={counts} selected={day} today={today} kind={kind} />

          {kindTabs.length > 1 && (
            <nav aria-label={tc("type")} className="flex gap-1 overflow-x-auto pb-1">
              <Link href={href(null)} scroll={false} replace className={tabClass(!kind)}>
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
                    className={tabClass(active)}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {t(`kind.${k}`)}
                    {n > 0 && <span className="tabular-nums text-[var(--ink-3)]">{n}</span>}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <Card>
          <TodoQuickAdd key={day ?? "all"} defaultDate={day} />
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
                <Button asChild variant="ghost">
                  <Link href="/my-work" scroll={false} replace>
                    {t("clearFilters")}
                  </Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <AgendaBuckets items={visible} locale={locale} today={today} />
        )}
      </div>
    </div>
  );
}
