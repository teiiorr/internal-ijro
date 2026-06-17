import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  const t = useTranslations();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass-bar sticky top-0 z-30 mx-3 sm:mx-6 mt-3 sm:mt-4 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-[var(--primary-foreground)] grid place-items-center font-bold shadow-[0_8px_20px_-4px_rgba(94,99,224,0.5)]">
            II
          </div>
          <div className="font-display font-bold text-lg sm:text-xl tracking-tight">{t("app.name")}</div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button asChild size="default" className="hidden sm:inline-flex">
            <Link href="/login">{t("landing.cta")}</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12 sm:py-20">
        <div className="max-w-3xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold bg-[var(--glass-fill)] backdrop-blur-xl backdrop-saturate-180 border border-[var(--glass-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_14px_-2px_rgba(31,38,135,0.06)]">
            <span className="size-2 rounded-full bg-[var(--success)] animate-pulse"></span>
            <span className="text-[var(--muted)]">{t("landing.tagline")}</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            {t("landing.hero")}
          </h1>
          <p className="text-lg sm:text-xl text-[var(--muted)] leading-relaxed max-w-2xl mx-auto">
            {t("app.tagline")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild size="xl">
              <Link href="/login">{t("landing.cta")}</Link>
            </Button>
            <Button asChild size="xl" variant="glass">
              <Link href="/register-contractor">{t("auth.login.registerContractor")}</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-sm text-[var(--muted)]">
        {t("landing.copyright")}
      </footer>
    </div>
  );
}
