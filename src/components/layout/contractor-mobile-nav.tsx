"use client";
import { useEffect, useState } from "react";
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

type NavItem = { href: string; icon: React.ComponentType<{ className?: string; stroke?: number }>; key: string };

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

  // Marshrut o'zgarsa varaq yopiladi.
  useEffect(() => { setOpen(false); }, [pathname]);

  // To'liq ekranli suhbat ochilganda pastki panelni berkitamiz — u yozuv maydoniga xalaqit bermasin.
  if (/^\/contractor\/chats\/[^/]+/.test(pathname)) return null;

  const pinned = PINNED.map((h) => ITEMS.find((i) => i.href === h)).filter(Boolean) as NavItem[];
  const moreActive = ITEMS.some((i) => !PINNED.includes(i.href) && isActive(i.href));

  const cell = (active: boolean) =>
    cn(
      "relative flex min-w-0 flex-col items-center justify-center gap-1 py-2.5 transition-colors active:scale-95",
      active ? "text-tint" : "text-ink-3"
    );

  // Suhbatdagi o'qilmaganlar — xotirjam hisob (kapsula emas, radius 5/6).
  const tabBadge = (key: string) =>
    key === "chats" && unread > 0 ? (
      <span className="absolute -right-2 -top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-[5px] bg-tint px-1 text-[10px] font-bold tabular-nums text-on-tint">
        {unread > 99 ? "99+" : unread}
      </span>
    ) : null;

  const rowBadge = (key: string) =>
    key === "chats" && unread > 0 ? (
      <span className="grid h-5 min-w-5 place-items-center rounded-[6px] bg-tint px-1.5 text-[11px] font-bold tabular-nums text-on-tint">
        {unread > 99 ? "99+" : unread}
      </span>
    ) : null;

  return (
    <>
      {/* xira fon qoplamasi */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-overlay bg-black/40 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* to'liq menyuli, pastdan ko'tariladigan varaq — kuchli oyna, ichida tekis qatorlar */}
      <div
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 z-modal flex max-h-[85dvh] flex-col rounded-t-[24px] border-t border-[var(--line)] bg-[var(--glass-fill-strong)] shadow-[var(--shadow-overlay)] backdrop-blur-2xl backdrop-saturate-150 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        )}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <p className="t-h3 text-ink">{t("more")}</p>
          <button onClick={() => setOpen(false)} aria-label={t("more")} className="grid size-9 place-items-center rounded-[12px] text-ink-3 hover:bg-[var(--surface-2)] hover:text-ink transition-colors">
            <X className="size-5" />
          </button>
        </div>
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
          {ITEMS.map(({ href, icon: Icon, key }) => {
            const active = isActive(href);
            return (
              <li key={href} className="list-none">
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-[52px] items-center gap-3 rounded-[16px] px-3 text-[16px] font-semibold transition-colors",
                    active
                      ? "bg-[var(--surface-2)] text-ink before:absolute before:left-0 before:top-1/2 before:h-6 before:w-0.5 before:-translate-y-1/2 before:rounded-[2px] before:bg-tint before:content-['']"
                      : "text-ink-2 hover:bg-[var(--surface-2)] hover:text-ink"
                  )}
                >
                  <Icon className={cn("size-5 shrink-0", active ? "text-tint" : "text-ink-3")} stroke={1.75} />
                  <span className="flex-1 truncate">{t(key)}</span>
                  {rowBadge(key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* pastki panel: qadab qo'yilgan bo'limlar + Ko'proq */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-tabbar px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        <ul className="grid grid-cols-4 overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--glass-fill-strong)] shadow-[var(--shadow-floating)] backdrop-blur-xl backdrop-saturate-150">
          {pinned.map(({ href, icon: Icon, key }) => {
            const active = isActive(href);
            return (
              <li key={href} className="min-w-0">
                <Link href={href} className={cell(active)} aria-current={active ? "page" : undefined}>
                  <span className="relative">
                    <Icon className="size-6 shrink-0" stroke={1.75} />
                    {tabBadge(key)}
                  </span>
                  <span className="max-w-full truncate px-0.5 text-[11px] font-semibold leading-none">{t(key)}</span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0">
            <button onClick={() => setOpen(true)} className={cn(cell(moreActive || open), "w-full")} aria-haspopup="dialog">
              <Menu className="size-6 shrink-0" stroke={1.75} />
              <span className="max-w-full truncate px-0.5 text-[11px] font-semibold leading-none">{t("more")}</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
