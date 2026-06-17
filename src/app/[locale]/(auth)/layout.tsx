import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="mx-3 sm:mx-6 mt-3 sm:mt-4 rounded-3xl glass-strong relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-5 sm:px-7 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={52} />
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
