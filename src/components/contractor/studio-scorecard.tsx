import { getTranslations } from "next-intl/server";
import { getStudioScorecard } from "@/server/queries/studio";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";

function onTimeColor(pct: number | null): string {
  if (pct == null) return "var(--ink)";
  if (pct >= 85) return "var(--success)";
  if (pct >= 60) return "var(--warning)";
  return "var(--danger)";
}

/** Studiya samaradorligi — muddat intizomi, yakunlangan bosqichlar, qaytarishlar. */
export async function StudioScorecard({ companyId }: { companyId: string }) {
  const t = await getTranslations("contractors.scorecard");
  const s = await getStudioScorecard(companyId);
  if (s.projectCount === 0 && s.completedStages === 0) return null;

  const tiles: { label: string; value: string; color?: string }[] = [
    { label: t("onTime"), value: s.onTimePct == null ? "—" : `${s.onTimePct}%`, color: onTimeColor(s.onTimePct) },
    { label: t("completedStages"), value: String(s.completedStages) },
    { label: t("avgDuration"), value: s.avgDurationDays == null ? "—" : t("days", { n: s.avgDurationDays }) },
    { label: t("revisions"), value: String(s.revisions), color: s.revisions > 0 ? "var(--warning)" : undefined },
    { label: t("projects"), value: `${s.completedProjects}/${s.projectCount}` },
  ];

  return (
    <Section title={t("title")}>
      <Card solid>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 md:grid-cols-5">
          {tiles.map((tile) => (
            <div key={tile.label} className="min-w-0">
              <p className="truncate text-2xl font-black tabular-nums tracking-tight" style={{ color: tile.color ?? "var(--ink)" }}>
                {tile.value}
              </p>
              <p className="mt-0.5 truncate t-micro text-[var(--ink-3)]">{tile.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </Section>
  );
}
