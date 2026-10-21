import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { InternalDocsTabs } from "@/components/internal-docs/internal-docs-tabs";
import { AlphabetConverter } from "@/components/internal-docs/alphabet-converter";
import { canUseInternalDocs } from "@/lib/internal-docs/logic";

/** Yangi alifbo: Word faylni kirill yoki eski lotindan yangi lotin alifbosiga ögiriş. */
export default async function YangiAlifboPage() {
  const me = await requireUser();
  if (!canUseInternalDocs(me.position)) redirect("/contractor/dashboard");
  const t = await getTranslations();
  return (
    <div>
      <PageHeader title={t("nav.yangiAlifbo")} subtitle={t("nav.group.internalDocs")} tools={<InternalDocsTabs active="alifbo" />} />
      <AlphabetConverter />
    </div>
  );
}
