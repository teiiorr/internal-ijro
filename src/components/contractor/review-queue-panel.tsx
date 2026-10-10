import { getTranslations, getLocale } from "next-intl/server";
import { SmoothImage } from "@/components/ui/smooth-image";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { formatDate } from "@/lib/dates";

type Stage = { stageId: string; projectId: string; projectName: string; stageName: string; submittedAt: Date | string | null; submittedByName: string | null };
type Group = { studioId: string; studioName: string; studioLogo: string | null; oldestSubmittedAt: Date | string | null; stages: Stage[] };

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

/** "Sizni kutmoqda" — BKRM koʻrigini kutayotgan studiya topshiriqlari, eng eskisi birinchi.
 *  BIIB grammatikasi: bitta seksiya, sarlavha + sarhisob meta, ichida qattiq karta va
 *  ajratuvchi qatorlar (quti emas). Butun qator studiya koʻrish ish maydoniga deep-link
 *  qiladi. Navbat boʻsh boʻlsa — null. */
export async function ReviewQueuePanel({ groups }: { groups: Group[] }) {
  if (groups.length === 0) return null;
  const t = await getTranslations();
  const locale = await getLocale();
  const total = groups.reduce((n, g) => n + g.stages.length, 0);
  // Qatorlarni studiyalar boʻyicha tartibda tekis roʻyxatga yoyamiz (eng eski birinchi).
  const items = groups.flatMap((g) =>
    g.stages.map((s) => ({ ...s, studioId: g.studioId, studioName: g.studioName, studioLogo: g.studioLogo })),
  );

  return (
    <Section
      title={t("contractors.reviewQueue.title")}
      meta={<span className="text-[var(--warning)]">{total}</span>}
    >
      <Card bare className="px-5 sm:px-6">
        <Rows>
          {items.map((s) => (
            <Row key={s.stageId} href={`/contractors/${s.studioId}?review=${s.projectId}`}>
              <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--surface-2)]">
                {s.studioLogo ? (
                  <SmoothImage src={s.studioLogo} alt={s.studioName} className="size-full object-cover" />
                ) : (
                  <span className="t-micro font-bold text-[var(--ink-3)]">{initial(s.studioName)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">
                  {s.projectName}
                  <span className="font-normal text-[var(--ink-3)]">{`, ${s.stageName}`}</span>
                </p>
                <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">
                  {s.studioName}
                  {s.submittedAt ? `, ${t("contractors.reviewQueue.submitted")} ${formatDate(s.submittedAt, locale)}` : ""}
                  {s.submittedByName ? `, ${s.submittedByName}` : ""}
                </p>
              </div>
            </Row>
          ))}
        </Rows>
      </Card>
    </Section>
  );
}
