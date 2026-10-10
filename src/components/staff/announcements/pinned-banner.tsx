import { getTranslations } from "next-intl/server";
import type { Position } from "@/lib/db/schema";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { getActivePinned } from "@/server/queries/announcements";
import { PinnedBannerItem } from "./pinned-banner-item";

/**
 * Dashboard tepasidagi qadalgan eʼlonlar (koʻpi bilan 3 ta, men hali oʻqimaganlari).
 * BIIB grammatikasi: bitta seksiya, ichida oyna karta va ajratuvchi qatorlar (quti emas).
 * Yoʻq boʻlsa null. dashboard/page.tsx uni <Suspense fallback={null}> ichida mount qiladi.
 */
export async function PinnedAnnouncementsBanner({
  userId,
  position,
  departmentId,
}: {
  userId: string;
  position: Position;
  departmentId: string | null;
}) {
  const items = await getActivePinned({ id: userId, position, departmentId });
  if (items.length === 0) return null;
  const t = await getTranslations("staffX.announcements");
  return (
    <Section title={t("pinnedTitle")}>
      <Card bare className="px-5 sm:px-6">
        <ul className="-my-1 divide-y divide-[var(--line)]">
          {items.map((a) => (
            <PinnedBannerItem key={a.id} id={a.id} title={a.title} important={a.importance === "important"} />
          ))}
        </ul>
      </Card>
    </Section>
  );
}
