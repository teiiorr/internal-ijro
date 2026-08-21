"use client";
import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { IconLayoutDashboard as LayoutDashboard, IconFolder as Folder, IconUser as UserIcon, IconBell as Bell, IconSettings as Settings, IconMenu2 as Menu, IconX as X } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; icon: React.ComponentType<{ className?: string }>; key: string };

const ITEMS: NavItem[] = [
  { href: "/contractor/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/contractor/projects", icon: Folder, key: "projects" },
  { href: "/contractor/profile", icon: UserIcon, key: "profile" },
  { href: "/notifications", icon: Bell, key: "notifications" },
  { href: "/settings", icon: Settings, key: "settings" },
];

const PINNED = ["/contractor/dashboard", "/contractor/projects", "/contractor/profile"];

export function ContractorMobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const pinned = PINNED.map((h) => ITEMS.find((i) => i.href === h)).filter(Boolean) as NavItem[];
  const moreActive = ITEMS.some((i) => !PINNED.includes(i.href) && isActive(i.href));

  const cell = (active: boolean) =>
    cn(
      "flex min-w-0 flex-col items-center justify-center gap-1 py-3 transition-all active:scale-95",
      active ? "text-[var(--primary)]" : "text-[var(--muted)]"
    );

  return (
    <>
      <div
        className={cn("md:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-200", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <div
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 z-40 rounded-t-3xl glass-strong p-4 pb-8 transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold">{t("more")}</p>
          <button onClick={() => setOpen(false)} aria-label={t("more")} className="grid size-9 place-items-center rounded-xl text-[var(--muted)] hover:bg-[var(--glass-fill)]">
            <X className="size-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ITEMS.map(({ href, icon: Icon, key }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-3 text-center transition-colors",
                  active ? "bg-[var(--primary)] text-white" : "text-[var(--foreground)] hover:bg-[var(--glass-fill)]"
                )}
              >
                <Icon className="size-6 shrink-0" />
                <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{t(key)}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-3 pt-1">
        <ul className="grid grid-cols-4 rounded-3xl glass-strong overflow-hidden">
          {pinned.map(({ href, icon: Icon, key }) => {
            const active = isActive(href);
            return (
              <li key={href} className="min-w-0">
                <Link href={href} className={cell(active)}>
                  <Icon className={cn("size-6 shrink-0", active && "drop-shadow-[0_0_8px_var(--primary-glow)]")} />
                  <span className="max-w-full truncate px-1 text-[11px] font-bold leading-none">{t(key)}</span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0">
            <button onClick={() => setOpen(true)} className={cn(cell(moreActive || open), "w-full")}>
              <Menu className="size-6 shrink-0" />
              <span className="max-w-full truncate px-1 text-[11px] font-bold leading-none">{t("more")}</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
