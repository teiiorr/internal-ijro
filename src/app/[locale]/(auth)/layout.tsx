import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { Link } from "@/i18n/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="mx-3 sm:mx-6 mt-3 sm:mt-4 rounded-3xl glass-strong relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-5 sm:px-7 py-3">
          <Link href="/" className="flex items-center">
            <BrandLogo className="h-12 sm:h-16" />
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
