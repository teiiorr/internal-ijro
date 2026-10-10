import { getTranslations } from "next-intl/server";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Status } from "@/components/ui-biib/Status";
import { BUCKET_ORDER, type Bucket } from "@/lib/my-work/buckets";
import type { AgendaItem } from "@/server/queries/my-work";
import { KIND_ICON, KindChip, shortDate } from "./kind-meta";
import { TodoRow } from "./todo-row";

/** Boʻlim sarhisobining rangi (sanoq qaror talab qilganda ajralib turadi). */
const BUCKET_TONE: Record<Bucket, string> = {
  overdue: "var(--danger)",
  today: "var(--info)",
  tomorrow: "var(--warning)",
  week: "var(--ink-3)",
  later: "var(--ink-3)",
  nodate: "var(--ink-3)",
};

function AgendaRow({
  item,
  kindLabel,
  dateLabel,
  overdue,
}: {
  item: AgendaItem;
  kindLabel: string;
  dateLabel: string | null;
  overdue: boolean;
}) {
  const Icon = KIND_ICON[item.kind];
  return (
    <Row href={item.href ?? undefined}>
      <Icon className="size-[18px] shrink-0 text-[var(--ink-3)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{item.title}</div>
        <div className="mt-0.5 flex items-center gap-x-2 gap-y-0.5 truncate t-micro text-[var(--ink-3)]">
          <KindChip kind={item.kind} label={kindLabel} />
          {item.sub && <span className="min-w-0 truncate">{item.sub}</span>}
        </div>
      </div>
      {overdue && dateLabel ? (
        <Status tone="danger" dot className="shrink-0">
          {dateLabel}
        </Status>
      ) : dateLabel ? (
        <span className="shrink-0 t-micro tabular-nums text-[var(--ink-3)]">{dateLabel}</span>
      ) : null}
    </Row>
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
    <div className="flex flex-col gap-8 lg:gap-12">
      {groups.map(({ bucket, list }) => {
        const open = list.filter((i) => !i.done).length;
        // "Bugun"/"Ertaga"/"Sanasiz" boʻlimlarida sana takrorlanmaydi.
        const showDate = bucket !== "today" && bucket !== "tomorrow" && bucket !== "nodate";
        const overdue = bucket === "overdue";
        return (
          <Section
            key={bucket}
            title={t(`bucket.${bucket}`)}
            meta={
              open > 0 ? (
                <span style={{ color: BUCKET_TONE[bucket] }}>{open}</span>
              ) : undefined
            }
          >
            <Card bare className="px-5 sm:px-6">
              <Rows>
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
                      overdue={overdue}
                    />
                  ),
                )}
              </Rows>
            </Card>
          </Section>
        );
      })}
    </div>
  );
}
