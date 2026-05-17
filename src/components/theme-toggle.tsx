"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const isDark = resolved === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative inline-flex h-9 w-[68px] items-center rounded-full p-1 transition-colors",
        isDark ? "bg-[var(--primary)]" : "bg-[var(--surface-3)] border border-[var(--border)]"
      )}
    >
      <span
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-full bg-[var(--background-elevated)] shadow-soft transition-transform",
          isDark ? "translate-x-[32px]" : "translate-x-0"
        )}
      >
        {isDark ? (
          <Moon className="size-4 text-[var(--primary)]" />
        ) : (
          <Sun className="size-4 text-[var(--warning)]" />
        )}
      </span>
    </button>
  );
}
