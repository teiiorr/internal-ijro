"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, LogOut, Settings as SettingsIcon } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

function Avatar({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
  return (
    <div className="size-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-[var(--primary-foreground)] flex items-center justify-center text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_8px_-2px_rgba(94,99,224,0.4)]">
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
    <header className="sticky top-0 z-30 h-[68px] glass-bar">
      <div className="h-full flex items-center gap-3 px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 mr-2">
          <div className="size-10 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_14px_-2px_rgba(94,99,224,0.45)]">
            <span className="text-white text-[15px] font-bold tracking-tight">II</span>
          </div>
          <span className="hidden sm:inline font-display font-bold text-lg tracking-tight text-[var(--foreground)]">
            {t("app.name")}
          </span>
        </Link>

        <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-md ml-4">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[var(--subtle)]" />
            <input
              placeholder={t("header.searchPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-11 w-full rounded-full border border-[var(--border-strong)] bg-[var(--glass-fill-strong)] backdrop-blur-xl backdrop-saturate-180 pl-11 pr-4 text-[14px] placeholder:text-[var(--subtle)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:shadow-[0_0_0_4px_var(--primary-soft)] transition-[border-color,box-shadow] duration-200"
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
                "flex items-center gap-2.5 rounded-full pl-1 pr-4 py-1 transition-colors",
                menuOpen ? "bg-[var(--surface-3)]" : "hover:bg-[var(--surface-3)]"
              )}
            >
              <Avatar name={userName} />
              <span className="hidden md:inline text-sm font-semibold">{userName}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill-strong)] backdrop-blur-2xl backdrop-saturate-180 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_16px_40px_-12px_rgba(15,17,28,0.18)] z-50">
                <div className="px-3 py-2.5 border-b border-[var(--border)] mb-1.5">
                  <p className="text-sm font-bold">{userName}</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-[var(--surface-3)]"
                >
                  <SettingsIcon className="size-4 text-[var(--muted)]" /> {t("header.accountSettings")}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)]"
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
