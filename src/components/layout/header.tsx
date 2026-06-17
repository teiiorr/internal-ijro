"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, LogOut, Settings as SettingsIcon } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Logo } from "@/components/logo";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

function Avatar({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
  return (
    <div className="size-8 rounded-sm bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center text-xs font-semibold">
      {initials}
    </div>
  );
}

export function Header({ userName }: { userName: string }) {
  const t = useTranslations();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
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
    <header className="sticky top-0 z-30 h-14 bg-[var(--surface)] border-b border-[var(--border)]">
      <div className="h-full flex items-center gap-3 px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 mr-2 shrink-0">
          <Logo size={28} />
          <span className="hidden sm:inline font-semibold text-[15px] tracking-tight text-[var(--foreground)]">
            {t("app.name")}
          </span>
        </Link>

        <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-md ml-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--subtle)]" />
            <input
              placeholder={t("header.searchPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--input)] bg-[var(--surface)] pl-9 pr-3 text-[14px] placeholder:text-[var(--subtle)] focus-visible:outline-none focus-visible:border-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] transition-colors"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <LanguageSwitcher />
          <ThemeToggle />

          <div ref={menuRef} className="relative ml-1">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2 rounded-md pl-1 pr-3 py-1 transition-colors",
                menuOpen ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]"
              )}
            >
              <Avatar name={userName} />
              <span className="hidden md:inline text-sm font-medium">{userName}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-md border border-[var(--border)] bg-[var(--popover)] p-1 shadow-[var(--shadow-3)] z-50">
                <div className="px-3 py-2.5 border-b border-[var(--border)] mb-1">
                  <p className="text-sm font-semibold">{userName}</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
                >
                  <SettingsIcon className="size-4 text-[var(--muted)]" /> {t("header.accountSettings")}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
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
