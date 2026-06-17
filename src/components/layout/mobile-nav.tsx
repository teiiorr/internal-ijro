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
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--surface)] border-t border-[var(--border)]">
      <ul className="grid grid-cols-4">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center py-2.5 gap-1 transition-colors",
                  active ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                )}
              >
                <Icon className="size-5" />
                <span className="text-[11px] font-medium leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
