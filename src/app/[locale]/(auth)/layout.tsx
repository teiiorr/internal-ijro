import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div aria-hidden className="orb orb-primary size-[460px] -top-40 -left-32" />
      <div aria-hidden className="orb orb-accent size-[420px] -bottom-32 -right-24" />

      <header className="mx-3 sm:mx-6 mt-3 sm:mt-4 rounded-3xl glass-strong relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-5 sm:px-7 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={36} />
            <span className="font-extrabold text-[16px] tracking-tight text-[var(--foreground)]">{t("app.name")}</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-5 sm:p-8 relative z-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
