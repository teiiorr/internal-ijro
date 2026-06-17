"use client";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, CheckSquare, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", icon: LayoutDashboard, label: t("dashboard") },
    { href: "/tasks", icon: CheckSquare, label: t("tasks") },
    { href: "/notifications", icon: Bell, label: t("notifications") },
    { href: "/settings", icon: User, label: t("settings") },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-3 pt-1">
      <ul className="grid grid-cols-4 rounded-3xl glass-strong overflow-hidden">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center py-3 gap-1 transition-all active:scale-95",
                  active ? "text-[var(--primary)]" : "text-[var(--muted)]"
                )}
              >
                <Icon className={cn("size-6", active && "drop-shadow-[0_0_8px_var(--primary-glow)]")} />
                <span className="text-[11px] font-bold leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
