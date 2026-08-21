"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "@/i18n/navigation";
import { IconSearch as Search, IconLogout as LogOut, IconSettings as SettingsIcon } from "@tabler/icons-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { BrandLogo } from "@/components/brand-logo";
import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";

export function Header({ userName, avatarUrl, rawName }: { userName: string; avatarUrl?: string | null; rawName?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const displayName = rawName ? userName : localizeName(userName, locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  // Task search belongs to the Tasks section only — hide it everywhere else.
  const onTasks = pathname === "/tasks" || pathname.startsWith("/tasks/");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/tasks?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="sticky top-0 z-30 glass-bar">
      <div className="h-[60px] sm:h-[68px] flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-8 max-w-[1500px] mx-auto">
        <Link href="/dashboard" className="flex items-center mr-1 sm:mr-3 shrink-0">
          <BrandLogo className="h-10 sm:h-14" />
        </Link>

        {onTasks && (
          <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-md ml-4">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[var(--subtle)]" />
              <input
                placeholder={t("header.searchPlaceholder")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-11 w-full rounded-full border border-[var(--input)] bg-[var(--glass-fill-strong)] backdrop-blur-xl backdrop-saturate-180 pl-11 pr-4 text-[14px] font-medium placeholder:text-[var(--subtle)] focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:shadow-[0_0_0_2px_var(--primary-glow)] transition-all duration-200"
              />
            </div>
          </form>
        )}

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
          <NotificationBell />
          <LanguageSwitcher />
          <ThemeToggle />

          <div ref={menuRef} className="relative ml-0.5 sm:ml-1">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl pl-1 pr-1 sm:pr-3 py-1 transition-colors",
                menuOpen ? "bg-[var(--glass-fill-strong)]" : "hover:bg-[var(--glass-fill)]"
              )}
            >
              <UserAvatar name={displayName} avatarUrl={avatarUrl} size="sm" clickable={false} />
              <span className="hidden md:inline text-sm font-bold">{displayName}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl glass-strong p-1.5 z-50">
                <div className="px-3 py-3 border-b border-[var(--border)] mb-1.5">
                  <p className="text-xs font-medium text-[var(--muted)]">{t("header.signedInAs")}</p>
                  <p className="text-sm font-bold mt-1">{displayName}</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[var(--glass-fill)] transition-colors"
                >
                  <SettingsIcon className="size-4 text-[var(--muted)]" /> {t("header.accountSettings")}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
                >
                  <LogOut className="size-4" /> {t("header.signOut")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
