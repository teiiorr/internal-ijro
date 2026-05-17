"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, LogOut, Settings as SettingsIcon } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

function Avatar({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
  return (
    <div className="size-9 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center text-sm font-semibold">
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
    <header className="sticky top-0 z-30 h-16 bg-[var(--background)]/85 backdrop-blur-md border-b border-[var(--border)]">
      <div className="h-full flex items-center gap-3 px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 mr-2">
          <div className="size-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <span className="text-[var(--primary-foreground)] text-sm font-bold tracking-tight">II</span>
          </div>
          <span className="hidden sm:inline font-display font-bold text-[17px] tracking-tight text-[var(--foreground)]">
            Ichki Ijro
          </span>
        </Link>

        <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-md ml-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--subtle)]" />
            <input
              placeholder={t("header.searchPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] pl-10 pr-3 text-[14px] placeholder:text-[var(--subtle)] focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:shadow-[0_0_0_4px_var(--primary-soft)] transition-[border-color,box-shadow] duration-150"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          <NotificationBell />
          <LanguageSwitcher />
          <ThemeToggle />

          <div ref={menuRef} className="relative ml-1">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2.5 rounded-full pl-1 pr-3 py-1 hover:bg-[var(--surface-3)] transition-colors",
                menuOpen && "bg-[var(--surface-3)]"
              )}
            >
              <Avatar name={userName} />
              <span className="hidden md:inline text-sm font-medium">{userName}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--popover)] p-1.5 shadow-lifted z-50">
                <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
                  <p className="text-sm font-semibold">{userName}</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-3)]"
                >
                  <SettingsIcon className="size-4 text-[var(--muted)]" /> {t("header.accountSettings")}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger-soft)]"
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
