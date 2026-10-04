"use client";
import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  IconLayoutDashboard as LayoutDashboard,
  IconFolder as Folder,
  IconMessageCircle as MessageCircle,
  IconClipboardList as ClipboardList,
  IconCalendarClock as CalendarClock,
  IconCoins as Coins,
  IconFiles as Files,
  IconUser as UserIcon,
  IconSettings as Settings,
  IconMenu2 as Menu,
  IconX as X,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; icon: React.ComponentType<{ className?: string }>; key: string };

// Studiya portalining to'liq menyusi (desktop sidebar bilan bir xil + Profil).
const ITEMS: NavItem[] = [
  { href: "/contractor/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/contractor/projects", icon: Folder, key: "projects" },
  { href: "/contractor/tasks", icon: ClipboardList, key: "tasks" },
  { href: "/contractor/chats", icon: MessageCircle, key: "chats" },
  { href: "/contractor/deadlines", icon: CalendarClock, key: "deadlines" },
  { href: "/contractor/payments", icon: Coins, key: "payments" },
  { href: "/contractor/documents", icon: Files, key: "documents" },
  { href: "/contractor/profile", icon: UserIcon, key: "profile" },
  { href: "/contractor/settings", icon: Settings, key: "settings" },
];

// Pastki panelda doimiy turadigan uchta bo'lim (+ "Ko'proq" tugmasi) — xodimlar ilovasi kabi.
const PINNED = ["/contractor/dashboard", "/contractor/projects", "/contractor/chats"];

export function ContractorMobileNav({ unread = 0 }: { unread?: number }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // To'liq ekranli suhbat ochilganda pastki panelni berkitamiz — u yozuv maydoniga xalaqit bermasin.
  if (/^\/contractor\/chats\/[^/]+/.test(pathname)) return null;

  const pinned = PINNED.map((h) => ITEMS.find((i) => i.href === h)).filter(Boolean) as NavItem[];
  const moreActive = ITEMS.some((i) => !PINNED.includes(i.href) && isActive(i.href));

  const cell = (active: boolean) =>
    cn(
      "flex min-w-0 flex-col items-center justify-center gap-1 py-3 transition-all active:scale-95",
      active ? "text-[var(--primary)]" : "text-[var(--muted)]"
    );

  const badge = (key: string) =>
    key === "chats" && unread > 0 ? (
      <span className="absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-white tabular-nums ring-2 ring-[var(--glass-fill-strong)]">
        {unread > 99 ? "99+" : unread}
      </span>
    ) : null;

  return (
    <>
      {/* xira fon qoplamasi */}
      <div
        className={cn("md:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-200", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* to'liq menyuli, pastdan ko'tariladigan varaq */}
      <div
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 z-40 flex max-h-[85dvh] flex-col rounded-t-3xl glass-strong p-4 pb-[max(2rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        )}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <p className="text-base font-bold">{t("more")}</p>
          <button onClick={() => setOpen(false)} aria-label={t("more")} className="grid size-9 place-items-center rounded-xl text-[var(--muted)] hover:bg-[var(--glass-fill)]">
            <X className="size-5" />
          </button>
        </div>
        <div className="grid min-h-0 grid-cols-3 gap-2 overflow-y-auto overscroll-contain">
          {ITEMS.map(({ href, icon: Icon, key }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "relative flex min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-3 text-center transition-colors",
                  active ? "bg-[var(--primary)] text-white" : "text-[var(--foreground)] hover:bg-[var(--glass-fill)]"
                )}
              >
                <span className="relative">
                  <Icon className="size-6 shrink-0" />
                  {badge(key)}
                </span>
                <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{t(key)}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* pastki panel: qadab qo'yilgan bo'limlar + Ko'proq */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
        <ul className="grid grid-cols-4 overflow-hidden rounded-3xl glass-strong">
          {pinned.map(({ href, icon: Icon, key }) => (
            <li key={href} className="min-w-0">
              <Link href={href} className={cell(isActive(href))}>
                <span className="relative">
                  <Icon className="size-6 shrink-0" />
                  {badge(key)}
                </span>
                <span className="max-w-full truncate px-1 text-[11px] font-bold leading-none">{t(key)}</span>
              </Link>
            </li>
          ))}
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
