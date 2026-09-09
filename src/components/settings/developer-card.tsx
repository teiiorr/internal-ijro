import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import {
  IconCode as Code,
  IconShieldLock as ShieldLock,
  IconExternalLink as ExternalLink,
  IconBrandTelegram as Telegram,
  IconBrandInstagram as Instagram,
  IconPhone as Phone,
} from "@tabler/icons-react";

const CONTACT_CLS =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]";

// Dastur muallifi haqida — mualliflik va intellektual mulk to'g'risidagi eslatma.
export async function DeveloperCard() {
  const t = await getTranslations("developer");
  return (
    <Card>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-white">
            <Code className="size-5" />
          </span>
          <h2 className="text-lg font-bold tracking-tight">{t("title")}</h2>
        </div>

        <p className="leading-relaxed text-[var(--foreground)]">{t("p1")}</p>

        <div className="flex items-start gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5 text-sm">
          <ShieldLock className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
          <div className="space-y-2">
            <p className="leading-relaxed">{t("p2")}</p>
            <p className="leading-relaxed text-[var(--muted)]">{t("p3")}</p>
            <a
              href="https://lex.uz"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] hover:underline"
            >
              <ExternalLink className="size-3.5" />
              {t("lex")}
            </a>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">{t("contacts")}</p>
          <div className="flex flex-wrap gap-2">
            <a href="https://t.me/B_D_Murodkhojaev" target="_blank" rel="noreferrer" className={CONTACT_CLS}>
              <Telegram className="size-4" /> @B_D_Murodkhojaev
            </a>
            <a href="https://instagram.com/teiior" target="_blank" rel="noreferrer" className={CONTACT_CLS}>
              <Instagram className="size-4" /> @teiior
            </a>
            <a href="tel:+998884649669" className={CONTACT_CLS}>
              <Phone className="size-4" /> +998 88 464 96 69
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
