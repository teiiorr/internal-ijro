"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Search, LogOut, User as UserIcon } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { Input } from "@/components/ui/input";

export function Header({ userName }: { userName: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        if (!cancelled && res.ok) {
          const j = (await res.json()) as { count: number };
          setUnread(j.count);
        }
      } catch {}
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/tasks?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-[var(--background-elevated)] px-4 md:px-6">
      <Link href="/dashboard" className="font-semibold text-lg text-[var(--primary)]">Ichki Ijro</Link>
      <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-xl mx-auto items-center gap-2">
        <Search className="size-4 text-[var(--muted)]" />
        <Input placeholder="Search tasks..." className="h-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      <div className="ml-auto flex items-center gap-1">
        <Button asChild variant="ghost" size="icon" aria-label="Notifications">
          <Link href="/notifications" className="relative">
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--danger)] text-white text-[10px] flex items-center justify-center">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </Button>
        <LanguageSwitcher />
        <ThemeToggle />
        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => setMenuOpen((v) => !v)}>
            <UserIcon className="size-4" />
            <span className="hidden sm:inline">{userName}</span>
          </Button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-lg border bg-[var(--popover)] p-1 shadow-md z-50">
              <Link href="/settings" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--accent)]" onClick={() => setMenuOpen(false)}>
                Settings
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--accent)]"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
