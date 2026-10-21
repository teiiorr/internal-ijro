import { getTranslations } from "next-intl/server";
import { Segmented } from "@/components/ui-biib/Segmented";
import type { InternalDocKind } from "@/lib/db/tables/internal-documents";
import { internalDocsPath } from "@/lib/internal-docs/logic";

/** "Ichki hujjatlar" boʻlimining koʻrinish almashtirgichi: Bildirgilar / Buyruqlar / Yangi alifbo. */
export async function InternalDocsTabs({ active }: { active: InternalDocKind | "alifbo" }) {
  const t = await getTranslations("nav");
  const items = [
    { href: internalDocsPath("bildirgi"), label: t("bildirgilar"), active: active === "bildirgi" },
    { href: internalDocsPath("buyruq"), label: t("buyruqlar"), active: active === "buyruq" },
    { href: "/ichki-hujjatlar/yangi-alifbo", label: t("yangiAlifbo"), active: active === "alifbo" },
  ];
  return <Segmented items={items} className="min-w-0 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" />;
}
