import { getTranslations } from "next-intl/server";
import { Segmented } from "@/components/ui-biib/Segmented";

/**
 * Kengashlar boʻlimining bitta koʻrinish almashtirgichi (ekspert / smeta / ijro).
 * Eski sahifalararo tugma va notoʻgʻri "orqaga" tiklanishi oʻrnini bosadi: har bir
 * kengash sahifasida bir xil segmented, joriy koʻrinish faol. `ijro` faqat staff uchun.
 */
export async function CouncilTabs({
  active,
  showIjro = true,
}: {
  active: "ekspert" | "smeta" | "ijro";
  showIjro?: boolean;
}) {
  const t = await getTranslations("nav");
  const items = [
    { href: "/kengashlar/ekspert", label: t("ekspertKengash"), active: active === "ekspert" },
    { href: "/kengashlar/smeta", label: t("smetaKengash"), active: active === "smeta" },
    ...(showIjro
      ? [{ href: "/kengashlar/ijro", label: t("councilResolutions"), active: active === "ijro" }]
      : []),
  ];
  return <Segmented items={items} className="min-w-0 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" />;
}
