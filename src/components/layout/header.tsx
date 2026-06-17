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
    <div className="size-9 rounded-lg bg-[var(--foreground)] text-[var(--background)] flex items-center justify-center text-[13px] font-bold">
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
    <header className="sticky top-0 z-30 bg-[var(--background)] border-b-2 border-[var(--foreground)]">
      <div className="h-16 flex items-center gap-3 px-5 md:px-10">
        <Link href="/dashboard" className="flex items-center gap-3 mr-3 shrink-0">
          <Logo size={32} />
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-[15px] tracking-tight leading-none">{t("app.name")}</span>
            <span className="eyebrow mt-1 text-[10px]">MMXXVI</span>
          </div>
        </Link>

        <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-md ml-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--subtle)]" />
            <input
              placeholder={t("header.searchPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 w-full rounded-lg border-2 border-[var(--input)] bg-[var(--surface)] pl-9 pr-3 text-[14px] font-medium placeholder:text-[var(--subtle)] focus-visible:outline-none focus-visible:border-[var(--foreground)] transition-colors"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <LanguageSwitcher />
          <ThemeToggle />

          <div ref={menuRef} className="relative ml-2">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg pl-1 pr-3 py-1 transition-colors",
                menuOpen ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]"
              )}
            >
              <Avatar name={userName} />
              <span className="hidden md:inline text-sm font-bold">{userName}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border-2 border-[var(--foreground)] bg-[var(--popover)] p-1.5 shadow-[var(--shadow-3)] z-50">
                <div className="px-3 py-3 border-b-2 border-[var(--border)] mb-1.5">
                  <p className="eyebrow text-[10px]">{t("header.signedInAs") ?? "Signed in"}</p>
                  <p className="text-sm font-bold mt-1">{userName}</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold hover:bg-[var(--surface-2)] transition-colors"
                >
                  <SettingsIcon className="size-4" /> {t("header.accountSettings")}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
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
