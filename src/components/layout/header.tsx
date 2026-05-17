"use client";
import { Bell, Search, LogOut, User as UserIcon } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { Input } from "@/components/ui/input";
import * as React from "react";

export function Header({ userName }: { userName: string }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-[var(--background-elevated)] px-4 md:px-6">
      <div className="font-semibold text-lg text-[var(--primary)]">Ichki Ijro</div>
      <div className="hidden md:flex flex-1 max-w-xl mx-auto items-center gap-2">
        <Search className="size-4 text-[var(--muted)]" />
        <Input placeholder="Search..." className="h-9" />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-5" />
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
