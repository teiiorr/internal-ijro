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
    <div className="size-9 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center text-[12px] font-extrabold shadow-[inset_0_1px_0_rgba(255,255,255,0.20)]">
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
    <header className="sticky top-0 z-30 glass-bar">
      <div className="h-[60px] sm:h-[68px] flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-8 max-w-[1500px] mx-auto">
        <Link href="/dashboard" className="flex items-center gap-2 sm:gap-2.5 mr-1 sm:mr-3 shrink-0">
          <div className="sm:hidden"><Logo size={40} /></div>
          <div className="hidden sm:block"><Logo size={48} /></div>
          <span className="hidden sm:inline font-extrabold text-[17px] tracking-tight text-[var(--foreground)]">
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
              className="h-11 w-full rounded-full border border-[var(--input)] bg-[var(--glass-fill-strong)] backdrop-blur-xl backdrop-saturate-180 pl-11 pr-4 text-[14px] font-medium placeholder:text-[var(--subtle)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:shadow-[0_0_0_4px_var(--primary-glow)] transition-all duration-200"
            />
          </div>
        </form>

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
              <Avatar name={userName} />
              <span className="hidden md:inline text-sm font-bold">{userName}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl glass-strong p-1.5 z-50">
                <div className="px-3 py-3 border-b border-[var(--border)] mb-1.5">
                  <p className="text-xs font-medium text-[var(--muted)]">{t("header.signedInAs") ?? "Signed in"}</p>
                  <p className="text-sm font-bold mt-1">{userName}</p>
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
