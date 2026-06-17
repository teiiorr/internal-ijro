import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export default function LandingPage() {
  const t = useTranslations();
  return (
    <div className="min-h-screen flex flex-col">
      {/* Floating glass header */}
      <header className="mx-3 sm:mx-6 mt-3 sm:mt-4 rounded-3xl glass-strong">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-5 sm:px-7 py-3">
          <div className="flex items-center gap-3">
            <Logo size={38} />
            <span className="font-extrabold text-[17px] tracking-tight">{t("app.name")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button asChild size="default" className="hidden sm:inline-flex ml-2">
              <Link href="/login">{t("landing.cta")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 sm:px-8 py-14 sm:py-24 relative z-10">
        <div className="max-w-4xl text-center space-y-8">
          {/* Live pulse organization badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 glass-soft text-[12px] sm:text-[13px] font-semibold">
            <span className="size-2 rounded-full bg-[var(--success)] pulse-dot" />
            <span className="text-[var(--muted)]">{t("app.organizationName")}</span>
          </div>

          {/* Hero with gradient-text emphasis */}
          <h1 className="font-extrabold leading-[0.95] tracking-[-0.04em] text-[clamp(2.5rem,7vw,5.5rem)]">
            <span className="block">{t("landing.hero").split("—")[0]?.trim()}</span>
            <span className="gradient-text block mt-2">{t("landing.hero").split("—")[1]?.trim() ?? ""}</span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--muted)] leading-relaxed max-w-2xl mx-auto font-medium">
            {t("app.tagline")}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-3">
            <Button asChild size="xl">
              <Link href="/login">{t("landing.cta")}</Link>
            </Button>
            <Button asChild size="xl" variant="glass">
              <Link href="/register-contractor">{t("auth.login.registerContractor")}</Link>
            </Button>
          </div>

          {/* Stats glass row */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto pt-12">
            <div className="glass-card rounded-2xl px-4 py-5 sm:py-6">
              <p className="display-num text-3xl sm:text-4xl gradient-text">26</p>
              <p className="text-xs font-medium text-[var(--muted)] mt-2">{t("nav.employees")}</p>
            </div>
            <div className="glass-card rounded-2xl px-4 py-5 sm:py-6">
              <p className="display-num text-3xl sm:text-4xl gradient-text">3</p>
              <p className="text-xs font-medium text-[var(--muted)] mt-2">{t("nav.contractors")}</p>
            </div>
            <div className="glass-card rounded-2xl px-4 py-5 sm:py-6">
              <p className="display-num text-3xl sm:text-4xl gradient-text">∞</p>
              <p className="text-xs font-medium text-[var(--muted)] mt-2">{t("nav.projects")}</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="mx-3 sm:mx-6 mb-3 sm:mb-4 rounded-3xl glass">
        <div className="max-w-7xl mx-auto px-5 sm:px-7 py-4 text-center sm:text-left text-sm font-medium text-[var(--muted)]">
          {t("landing.copyright")}
        </div>
      </footer>
    </div>
  );
}
