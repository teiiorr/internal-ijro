import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui-biib/Button";

/**
 * Lokallashtirilgan 404 — notFound() chaqirilganda butun [locale] daraxti uchun.
 * Server komponenti: matn getTranslations orqali joriy til bo'yicha olinadi.
 */
export default async function NotFound() {
  const t = await getTranslations("errorPage");
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-5 grid size-16 place-items-center rounded-[var(--radius-card)] bg-[var(--surface-2)]">
          <span className="font-[family-name:var(--font-ui)] text-2xl font-bold tracking-tight text-[var(--ink-3)]">
            404
          </span>
        </div>
        <h1 className="t-h3 text-[var(--ink)]">{t("notFoundTitle")}</h1>
        <p className="mt-2 t-body text-[var(--ink-2)]">{t("notFoundDesc")}</p>
        <Button asChild className="mt-6">
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    </div>
  );
}
