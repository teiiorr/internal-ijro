"use client";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users,
  Building2,
  Briefcase,
  FileText,
  Bell,
  ScrollText,
  Settings,
  CalendarDays,
} from "lucide-react";
import type { Position } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  key: keyof IntlNav;
  allowed: Position[];
  section: "primary" | "work" | "system";
};
type IntlNav = {
  dashboard: string; tasks: string; projects: string; employees: string; departments: string;
  contractors: string; leaves: string; notifications: string; auditLog: string; settings: string;
};

const ALL: Position[] = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"];
const STAFF: Position[] = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis"];
const ADMIN: Position[] = ["direktor", "orinbosar"];
const HR_ROLES: Position[] = ["direktor", "orinbosar", "hr"];

const ITEMS: Item[] = [
  { href: "/dashboard",         icon: LayoutDashboard, key: "dashboard",      allowed: ALL,                                                                section: "primary" },
  { href: "/tasks",             icon: CheckSquare,     key: "tasks",          allowed: STAFF,                                                              section: "primary" },
  { href: "/projects",          icon: FolderKanban,    key: "projects",       allowed: ["direktor", "orinbosar", "koordinator", "bolim_boshligi"],         section: "work" },
  { href: "/employees",         icon: Users,           key: "employees",      allowed: HR_ROLES,                                                           section: "work" },
  { href: "/departments",       icon: Building2,       key: "departments",    allowed: ADMIN,                                                              section: "work" },
  { href: "/contractors",       icon: Briefcase,       key: "contractors",    allowed: ADMIN.concat("koordinator"),                                        section: "work" },
  { href: "/leaves",            icon: CalendarDays,    key: "leaves",         allowed: ALL,                                                                section: "work" },
  { href: "/notifications",     icon: Bell,            key: "notifications",  allowed: ALL,                                                                section: "system" },
  { href: "/audit-log",         icon: ScrollText,      key: "auditLog",       allowed: ADMIN.concat("hr"),                                                 section: "system" },
  { href: "/settings",          icon: Settings,        key: "settings",       allowed: ALL,                                                                section: "system" },
];

export function Sidebar({ position }: { position: Position }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const visible = ITEMS.filter((i) => i.allowed.includes(position));

  const sections: ("primary" | "work" | "system")[] = ["primary", "work", "system"];

  return (
    <aside className="hidden md:flex flex-col w-[248px] shrink-0 bg-[var(--background)] py-4 px-3">
      <nav className="space-y-6">
        {sections.map((s) => {
          const items = visible.filter((i) => i.section === s);
          if (items.length === 0) return null;
          return (
            <div key={s} className="space-y-0.5">
              {items.map(({ href, icon: Icon, key }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group flex items-center gap-3 rounded-[10px] px-3 h-10 text-[14px] font-medium relative",
                      active
                        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-3)]"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[var(--primary)]" />
                    )}
                    <Icon className={cn("size-[18px] shrink-0", active ? "text-[var(--primary)]" : "text-[var(--subtle)] group-hover:text-[var(--foreground)]")} />
                    <span>{t(key)}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
