import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  const t = useTranslations();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="font-semibold text-xl text-[var(--primary)]">{t("app.name")}</div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button asChild>
            <Link href="/login">{t("landing.cta")}</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{t("landing.hero")}</h1>
          <p className="text-lg text-[var(--muted)]">{t("app.tagline")}</p>
          <div className="flex gap-3 justify-center">
            <Button asChild size="lg">
              <Link href="/login">{t("landing.cta")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/register-contractor">{t("auth.login.registerContractor")}</Link>
            </Button>
          </div>
        </div>
      </main>
      <footer className="px-6 py-4 text-center text-sm text-[var(--muted)] border-t">
        © {new Date().getFullYear()} Bolalar Kontentini Rivojlantirish Markazi
      </footer>
    </div>
  );
}
