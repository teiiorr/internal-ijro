import { getLocale, getTranslations } from "next-intl/server";
import { getTeamStandups } from "@/server/queries/standup";
import { localizeName, shortName } from "@/lib/names";
import { Card } from "@/components/ui-biib/Card";
import { Heading } from "@/components/ui-biib/Heading";
import { UserAvatar } from "@/components/ui/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { IconClipboardText } from "@tabler/icons-react";

/** Rahbarlar uchun: butun jamoaning bugungi kunlik hisobotlari (kim topshirdi, toʻsiqlar). */
export default async function StandupTeamPage() {
  const t = await getTranslations("staffX.standupTeam");
  const locale = await getLocale();
  const rows = await getTeamStandups();
  const submitted = rows.filter((r) => r.submittedAt);
  const missing = rows.filter((r) => !r.submittedAt);

  const block = (label: string, value: string | null, tone?: "warning") =>
    value ? (
      <div>
        <p className="t-micro font-medium text-[var(--ink-3)]">{label}</p>
        <p className={`t-small whitespace-pre-wrap ${tone === "warning" ? "text-[var(--warning)]" : "text-[var(--ink)]"}`}>{value}</p>
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Heading level={2}>{t("title")}</Heading>
        <span className="t-small tabular-nums text-[var(--ink-2)]">
          {t("submittedCount", { done: submitted.length, total: rows.length })}
        </span>
      </div>

      {submitted.length === 0 ? (
        <EmptyState icon={IconClipboardText} title={t("empty")} />
      ) : (
        <div className="flex flex-col gap-3">
          {submitted.map((r) => (
            <Card key={r.userId} solid className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <div className="flex shrink-0 items-center gap-2.5 sm:w-52">
                <UserAvatar name={localizeName(r.fullName, locale)} avatarUrl={r.avatarUrl} size="sm" clickable={false} />
                <span className="truncate t-small font-semibold text-[var(--ink)]">{shortName(localizeName(r.fullName, locale))}</span>
              </div>
              <div className="grid min-w-0 flex-1 gap-2.5 sm:grid-cols-3">
                {block(t("doneYesterday"), r.doneYesterday)}
                {block(t("plannedToday"), r.plannedToday)}
                {block(t("blockers"), r.blockers, "warning")}
              </div>
            </Card>
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="t-label text-[var(--ink-2)]">{t("notSubmittedYet")}</p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((r) => (
              <span
                key={r.userId}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] px-2.5 py-1 t-small text-[var(--ink-2)]"
              >
                <UserAvatar name={localizeName(r.fullName, locale)} avatarUrl={r.avatarUrl} size="xs" clickable={false} />
                {shortName(localizeName(r.fullName, locale))}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
