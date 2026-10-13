import { getTranslations } from "next-intl/server";
import { IconAlertTriangle } from "@tabler/icons-react";
import { getEscalations } from "@/server/queries/dashboards";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Status } from "@/components/ui-biib/Status";

/** Diqqat talab qiladi — muddati oʻtgan bosqich/vazifalar (rahbar uchun eskalatsiya). */
export async function EscalationsWidget() {
  const t = await getTranslations("dashboard.escalations");
  const { stages, tasks } = await getEscalations();
  const total = stages.length + tasks.length;
  if (total === 0) return null;

  const items = [
    ...stages.map((s) => ({ ...s, kind: t("stage") })),
    ...tasks.map((s) => ({ ...s, kind: t("task") })),
  ]
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 8);

  return (
    <Section title={t("title")} meta={total}>
      <Card solid bare className="px-5 sm:px-6">
        <Rows>
          {items.map((it) => (
            <Row key={it.href} href={it.href}>
              <IconAlertTriangle className="size-4 shrink-0 text-[var(--danger)]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">{it.title}</p>
                <p className="truncate t-micro text-[var(--ink-3)]">{[it.kind, it.subtitle].filter(Boolean).join(" — ")}</p>
              </div>
              <Status tone="danger">{t("daysOverdue", { n: it.daysOverdue })}</Status>
            </Row>
          ))}
        </Rows>
      </Card>
    </Section>
  );
}
