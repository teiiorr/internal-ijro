import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui-biib/Card";
import {
  IconShieldLock as ShieldLock,
  IconExternalLink as ExternalLink,
  IconCertificate as Certificate,
  IconBrandTelegram as Telegram,
  IconBrandInstagram as Instagram,
  IconPhone as Phone,
} from "@tabler/icons-react";

const CONTACT_CLS =
  "inline-flex items-center gap-1.5 t-small font-semibold text-[var(--ink-2)] transition-colors hover:text-[var(--tint)]";
const LINK_CLS =
  "inline-flex items-center gap-1 font-semibold text-[var(--tint)] transition-colors hover:text-[var(--tint-hover)]";

// Dastur muallifi haqida — mualliflik va intellektual mulk toʻgʻrisidagi eslatma.
export async function DeveloperCard() {
  const t = await getTranslations("developer");
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-[family-name:var(--font-ui)] text-[1.0625rem] font-bold tracking-tight text-[var(--ink)] sm:text-[1.1875rem]">
        {t("title")}
      </h2>

      <p className="t-body leading-relaxed text-[var(--ink)]">{t("p1")}</p>

      {/* Huquqiy eslatma: bitta --surface-2 qadam, ramkasiz */}
      <div className="flex items-start gap-2.5 rounded-[var(--radius-m)] bg-[var(--surface-2)] p-4 t-small">
        <ShieldLock className="mt-0.5 size-4 shrink-0 text-[var(--tint)]" aria-hidden />
        <div className="flex flex-col gap-2">
          <p className="leading-relaxed text-[var(--ink)]">{t("p2")}</p>
          <p className="leading-relaxed text-[var(--ink-3)]">{t("p3")}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-0.5">
            <a href="/guvohnoma-dgu-68862.pdf" target="_blank" rel="noreferrer" className={LINK_CLS}>
              <Certificate className="size-4" aria-hidden />
              {t("cert")}
            </a>
            <a href="https://lex.uz/uz/docs/-1022944" target="_blank" rel="noreferrer" className={LINK_CLS}>
              <ExternalLink className="size-3.5" aria-hidden />
              {t("lex")}
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="t-small font-semibold text-[var(--ink)]">{t("contacts")}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <a href="https://t.me/B_D_Murodkhojaev" target="_blank" rel="noreferrer" className={CONTACT_CLS}>
            <Telegram className="size-4" aria-hidden /> @B_D_Murodkhojaev
          </a>
          <a href="https://instagram.com/teiior" target="_blank" rel="noreferrer" className={CONTACT_CLS}>
            <Instagram className="size-4" aria-hidden /> @teiior
          </a>
          <a href="tel:+998884649669" className={CONTACT_CLS}>
            <Phone className="size-4" aria-hidden /> +998 88 464 96 69
          </a>
        </div>
      </div>
    </Card>
  );
}
