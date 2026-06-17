import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <header className="flex items-center justify-between px-5 md:px-8 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-semibold text-[15px] tracking-tight text-[var(--foreground)]">{t("app.name")}</span>
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
