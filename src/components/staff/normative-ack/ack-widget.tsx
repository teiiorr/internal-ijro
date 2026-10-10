import { getTranslations } from "next-intl/server";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { listMyPendingAcks } from "@/server/queries/normative-ack";
import { deadlineLabel } from "./logic";

const MAX_ROWS = 4;
const DL_TONE: Record<"red" | "amber" | "muted" | "green", StatusTone> = {
  red: "danger",
  amber: "warning",
  muted: "neutral",
  green: "success",
};

/** "Tanishib chiqishim kerak (N)" — kutilayotgani boʻlmasa null. */
export async function AckWidget({ userId }: { userId: string }) {
  const items = await listMyPendingAcks(userId);
  if (items.length === 0) return null;
  const t = await getTranslations("staffX.normativeAck");

  return (
    <Section
      title={t("myPendingCount", { count: items.length })}
      seeAllHref={items.length > MAX_ROWS ? "/meyoriy-hujjatlar" : undefined}
      seeAllLabel={t("allPending", { count: items.length })}
    >
      <Card bare className="px-5 sm:px-6">
        <Rows>
          {items.slice(0, MAX_ROWS).map((it) => {
            const dl = deadlineLabel(it.daysLeft);
            return (
              <Row key={it.requestId} href={`/meyoriy-hujjatlar?ack=${it.requestId}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{it.fileName}</p>
                  {it.requestedByName && <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">{it.requestedByName}</p>}
                </div>
                <Status tone={DL_TONE[dl.tone]} className="shrink-0">
                  {t(dl.key, { count: dl.count })}
                </Status>
              </Row>
            );
          })}
        </Rows>
      </Card>
    </Section>
  );
}
