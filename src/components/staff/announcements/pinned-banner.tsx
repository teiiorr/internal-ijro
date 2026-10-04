import { getTranslations } from "next-intl/server";
import type { Position } from "@/lib/db/schema";
import { getActivePinned } from "@/server/queries/announcements";
import { PinnedBannerItem } from "./pinned-banner-item";

/**
 * Dashboard tepasidagi qadalgan eʼlonlar (koʻpi bilan 3 ta, men hali oʻqimaganlari).
 * Yoʻq boʻlsa null. Asosiy implementator dashboard/page.tsx'da salomlashuv blokidan
 * keyin <Suspense fallback={null}> ichida mount qiladi.
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
    <section aria-label={t("pinnedTitle")} className="space-y-2">
      {items.map((a) => (
        <PinnedBannerItem key={a.id} id={a.id} title={a.title} important={a.importance === "important"} />
      ))}
    </section>
  );
}
