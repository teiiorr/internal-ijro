import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export default function LandingPage() {
  const t = useTranslations();
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <header className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-5 md:px-8 py-3">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-semibold text-[15px] tracking-tight">{t("app.name")}</span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button asChild size="default" className="hidden sm:inline-flex ml-2">
              <Link href="/login">{t("landing.cta")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-16 sm:py-24">
        <div className="max-w-3xl text-center space-y-7">
          <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
            {t("app.organizationName")}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            {t("landing.hero")}
          </h1>
          <p className="text-base sm:text-lg text-[var(--muted)] leading-relaxed max-w-2xl mx-auto">
            {t("app.tagline")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild size="lg">
              <Link href="/login">{t("landing.cta")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/register-contractor">{t("auth.login.registerContractor")}</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-5 text-sm text-[var(--muted)]">
          {t("landing.copyright")}
        </div>
      </footer>
    </div>
  );
}
