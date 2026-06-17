import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <header className="border-b-2 border-[var(--foreground)] bg-[var(--background)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 md:px-10 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={32} />
            <div className="flex flex-col">
              <span className="font-bold text-[15px] tracking-tight leading-none">{t("app.name")}</span>
              <span className="eyebrow mt-1 text-[10px]">{t("app.organizationName").split(" ").slice(0, 2).join(" ")} · MMXXVI</span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
