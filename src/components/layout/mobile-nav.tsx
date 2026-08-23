"use client";
import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { IconLayoutDashboard as LayoutDashboard, IconListCheck as ListTodo, IconLayoutKanban as FolderKanban, IconUsers as Users, IconBuilding as Building2, IconHeartHandshake as Handshake, IconBell as Bell, IconFileText as ScrollText, IconSettings as Settings, IconPresentation as Presentation, IconCoins as Coins, IconShieldCheck as ShieldCheck, IconFileCheck as FileCheck2, IconCertificate as Certificate, IconMenu2 as Menu, IconX as X } from "@tabler/icons-react";
import type { Position } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type NavItem = { href: string; icon: React.ComponentType<{ className?: string }>; key: string; allowed: Position[]; allowedUserIds?: string[]; ownerOnly?: boolean };

const ALL: Position[] = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"];
const STAFF: Position[] = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis"];
const ADMIN: Position[] = ["direktor", "orinbosar"];
const HR_ROLES: Position[] = ["direktor", "orinbosar", "hr"];
const CONTRACTORS_EXTRA_USERS = ["90956fa9-4892-4677-a31b-10af180e341a"];

// Full menu (same as the desktop sidebar).
const ITEMS: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard", allowed: ALL },
  { href: "/tasks", icon: ListTodo, key: "tasks", allowed: STAFF },
  { href: "/projects", icon: FolderKanban, key: "projects", allowed: ALL },
  { href: "/tanlov", icon: Certificate, key: "tanlov", allowed: ALL },
  { href: "/kengashlar/ekspert", icon: Presentation, key: "ekspertKengash", allowed: STAFF },
  { href: "/kengashlar/smeta", icon: Coins, key: "smetaKengash", allowed: STAFF },
  { href: "/employees", icon: Users, key: "employees", allowed: HR_ROLES },
  { href: "/meyoriy-hujjatlar", icon: FileCheck2, key: "normativeDocs", allowed: ALL },
  { href: "/departments", icon: Building2, key: "departments", allowed: ADMIN },
  { href: "/contractors", icon: Handshake, key: "contractors", allowed: ADMIN.concat("koordinator", "bolim_boshligi"), allowedUserIds: CONTRACTORS_EXTRA_USERS },
  { href: "/notifications", icon: Bell, key: "notifications", allowed: ALL },
  { href: "/audit-log", icon: ScrollText, key: "auditLog", allowed: ADMIN.concat("hr") },
  { href: "/settings", icon: Settings, key: "settings", allowed: ALL },
  { href: "/owner", icon: ShieldCheck, key: "owner", allowed: [], ownerOnly: true },
];

// The three destinations that stay pinned in the bar (+ a More button).
const PINNED = ["/dashboard", "/tasks", "/projects"];

export function MobileNav({ position, userId, isOwner }: { position: Position; userId: string; isOwner?: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const allowed = ITEMS.filter((i) => (i.ownerOnly ? !!isOwner : i.allowed.includes(position) || i.allowedUserIds?.includes(userId)));
  const pinned = PINNED.map((h) => allowed.find((i) => i.href === h)).filter(Boolean) as NavItem[];
  const moreActive = allowed.some((i) => !PINNED.includes(i.href) && isActive(i.href));

  const cell = (active: boolean) =>
    cn(
      "flex min-w-0 flex-col items-center justify-center gap-1 py-3 transition-all active:scale-95",
      active ? "text-[var(--primary)]" : "text-[var(--muted)]"
    );

  return (
    <>
      {/* dim overlay */}
      <div
        className={cn("md:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-200", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* slide-up sheet with the full menu */}
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
          {allowed.map(({ href, icon: Icon, key }) => {
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

      {/* bottom bar: pinned items + More */}
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
