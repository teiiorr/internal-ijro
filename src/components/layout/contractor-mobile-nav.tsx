"use client";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { IconFolder as Folder, IconMessageCircle as MessageCircle, IconUser as UserIcon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; icon: React.ComponentType<{ className?: string }>; key: string };

// Uchta bölim, "yana" oynasi yöq. Bildirişnomalar (qöngğiroq) va Sozlamalar
// Header'da turadi; studiyaga har kuni kerak böladigan hamma narsa şu yerda bir bosişda.
const ITEMS: NavItem[] = [
  { href: "/contractor/projects", icon: Folder, key: "projects" },
  { href: "/contractor/chats", icon: MessageCircle, key: "chats" },
  { href: "/contractor/profile", icon: UserIcon, key: "profile" },
];

export function ContractorMobileNav({ unread = 0 }: { unread?: number }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
      <ul className="grid grid-cols-3 rounded-3xl glass-strong overflow-hidden">
        {ITEMS.map(({ href, icon: Icon, key }) => {
          const active = isActive(href);
          const badge = key === "chats" && unread > 0;
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-1 py-3 transition-all active:scale-95",
                  active ? "text-[var(--primary)]" : "text-[var(--muted)]"
                )}
              >
                <span className="relative">
                  <Icon className={cn("size-6 shrink-0")} />
                  {badge && (
                    <span className="absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-white tabular-nums ring-2 ring-[var(--glass-fill-strong)]">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate px-1 text-[11px] font-bold leading-none">{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
