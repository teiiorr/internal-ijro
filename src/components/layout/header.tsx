"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "@/i18n/navigation";
import { IconLogout as LogOut, IconSettings as SettingsIcon, IconChevronRight as ChevronRight } from "@tabler/icons-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { CommandPalette } from "@/components/layout/command-palette";
import { BrandLogo } from "@/components/brand-logo";
import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";

export function Header({ userName, avatarUrl, rawName, menuLinks }: { userName: string; avatarUrl?: string | null; rawName?: boolean; menuLinks?: { href: string; label: string }[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const displayName = rawName ? userName : localizeName(userName, locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 glass-bar">
      <div className="h-[68px] sm:h-[84px] flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-8 max-w-[1500px] mx-auto">
        {/* Tor ekranda logotip birinchi bo'lib kichrayadi — sarlavha hech qachon ekrandan chiqmaydi. */}
        <Link href="/dashboard" className="flex min-w-0 items-center overflow-hidden mr-1 sm:mr-3">
          <BrandLogo className="h-10 sm:h-16" />
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5">
          {!pathname.startsWith("/contractor") && <CommandPalette />}
          <NotificationBell />
          <LanguageSwitcher />
          {/* Mobil ekranda mavzu almashtirgich profil menyusiga ko'chadi (joy tejaladi). */}
          <ThemeToggle className="hidden sm:inline-flex" />

          <div ref={menuRef} className="relative ml-0.5 sm:ml-1">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2.5 rounded-[var(--radius-control)] pl-1 pr-1 sm:pr-3 py-1 transition-colors",
                menuOpen ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]"
              )}
            >
              <UserAvatar name={displayName} avatarUrl={avatarUrl} size="sm" clickable={false} />
              <span className="hidden md:inline text-sm font-bold text-[var(--ink)]">{displayName}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-[var(--radius-card)] glass-strong p-1.5 z-50">
                <div className="px-3 py-3 border-b border-[var(--line)] mb-1.5">
                  <p className="text-xs font-medium text-[var(--ink-3)]">{t("header.signedInAs")}</p>
                  <p className="text-sm font-bold mt-1 text-[var(--ink)]">{displayName}</p>
                </div>
                {menuLinks?.map((m) => (
                  <Link
                    key={m.href}
                    href={m.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    {m.label}
                    <ChevronRight className="size-4 text-[var(--ink-3)]" />
                  </Link>
                ))}
                <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] px-3 py-1.5 sm:hidden">
                  <span className="text-sm font-semibold text-[var(--ink)]">{t("theme.darkOn")}</span>
                  <ThemeToggle />
                </div>
                <Link
                  href={pathname.startsWith("/contractor") ? "/contractor/settings" : "/settings"}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <SettingsIcon className="size-4 text-[var(--ink-2)]" /> {t("header.accountSettings")}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
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
