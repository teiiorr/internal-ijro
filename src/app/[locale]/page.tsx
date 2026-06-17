import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export default function LandingPage() {
  const t = useTranslations();
  const year = "MMXXVI"; // 2026 in Roman for editorial flavor

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Editorial masthead */}
      <header className="border-b-2 border-[var(--foreground)] bg-[var(--background)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-5 md:px-10 py-4">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div className="flex flex-col">
              <span className="font-bold text-[15px] tracking-tight leading-none">{t("app.name")}</span>
              <span className="eyebrow mt-1 text-[10px]">№ 01 · {year}</span>
            </div>
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

      {/* Asymmetric hero */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-14 sm:py-24">
          {/* Organization tag — slightly rotated sticker */}
          <div className="mb-10 sm:mb-14">
            <span className="sticker inline-block px-3 py-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-md text-[11px] font-bold uppercase tracking-[0.18em]">
              {t("app.organizationName")}
            </span>
          </div>

          {/* Hero — sans + serif italic mix */}
          <h1 className="font-bold tracking-[-0.04em] leading-[0.92] text-[clamp(2.75rem,8vw,6rem)] max-w-5xl">
            {t("landing.hero").split("—")[0]}
            <span className="serif-italic text-[var(--foreground)] block sm:inline"> — </span>
            <span className="serif-italic">{t("landing.hero").split("—")[1] ?? ""}</span>
          </h1>

          {/* Two-column tagline + CTAs */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 mt-12 md:mt-16 items-end">
            <p className="text-lg sm:text-xl text-[var(--muted)] leading-[1.5] max-w-xl">
              {t("app.tagline")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:justify-end">
              <Button asChild size="xl">
                <Link href="/login">{t("landing.cta")}</Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/register-contractor">{t("auth.login.registerContractor")}</Link>
              </Button>
            </div>
          </div>

          {/* Editorial stats / accent cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-20 sm:mt-28">
            <div className="rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)] p-7">
              <p className="display-num text-[4.5rem] sm:text-[5rem]">26</p>
              <p className="eyebrow mt-2 !text-[var(--accent-foreground)]/70">{t("nav.employees")}</p>
            </div>
            <div className="rounded-2xl border-2 border-[var(--foreground)] bg-[var(--background)] p-7">
              <p className="display-num text-[4.5rem] sm:text-[5rem]">3</p>
              <p className="eyebrow mt-2">{t("nav.contractors")}</p>
            </div>
            <div className="rounded-2xl bg-[var(--foreground)] text-[var(--background)] p-7">
              <p className="serif-italic text-[4.5rem] sm:text-[5rem] leading-none">∞</p>
              <p className="eyebrow mt-2 !text-[var(--background)]/70">{t("nav.projects")}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Editorial footer */}
      <footer className="border-t-2 border-[var(--foreground)] bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-[var(--muted)] font-medium">{t("landing.copyright")}</p>
          <p className="eyebrow">№ 01 · {year}</p>
        </div>
      </footer>
    </div>
  );
}
