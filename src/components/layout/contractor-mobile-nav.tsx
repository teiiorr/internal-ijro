"use client";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { IconFolder as Folder, IconMessageCircle as MessageCircle, IconUser as UserIcon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; icon: React.ComponentType<{ className?: string }>; key: string };

// Three destinations, no "more" sheet. Notifications (bell) and Settings live in
// the Header; everything a studio needs day-to-day is one tap away here.
const ITEMS: NavItem[] = [
  { href: "/contractor/projects", icon: Folder, key: "projects" },
  { href: "/contractor/chats", icon: MessageCircle, key: "chats" },
  { href: "/contractor/profile", icon: UserIcon, key: "profile" },
];

export function ContractorMobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-3 pt-1">
      <ul className="grid grid-cols-3 rounded-3xl glass-strong overflow-hidden">
        {ITEMS.map(({ href, icon: Icon, key }) => {
          const active = isActive(href);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-1 py-3 transition-all active:scale-95",
                  active ? "text-[var(--primary)]" : "text-[var(--muted)]"
                )}
              >
                <Icon className={cn("size-6 shrink-0", active && "drop-shadow-[0_0_8px_var(--primary-glow)]")} />
                <span className="max-w-full truncate px-1 text-[11px] font-bold leading-none">{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
