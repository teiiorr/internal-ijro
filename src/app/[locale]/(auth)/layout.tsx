import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-5 md:px-8 py-4 glass-bar">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-10 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_14px_-2px_rgba(94,99,224,0.45)]">
            <span className="text-white text-[15px] font-bold tracking-tight">II</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-[var(--foreground)]">{t("app.name")}</span>
        </Link>
        <div className="flex items-center gap-2">
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
