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

type Item = { href: string; icon: React.ComponentType<{ className?: string }>; key: keyof IntlNav; allowed: Position[] };
type IntlNav = {
  dashboard: string; tasks: string; projects: string; employees: string; departments: string;
  contractors: string; reports: string; leaves: string; notifications: string; auditLog: string; settings: string;
};

const ALL: Position[] = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr"];
const STAFF: Position[] = ["direktor", "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis"];
const ADMIN: Position[] = ["direktor", "orinbosar"];
const HR_ROLES: Position[] = ["direktor", "orinbosar", "hr"];

const ITEMS: Item[] = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard", allowed: ALL },
  { href: "/tasks", icon: CheckSquare, key: "tasks", allowed: STAFF },
  { href: "/projects", icon: FolderKanban, key: "projects", allowed: ["direktor", "orinbosar", "koordinator", "bolim_boshligi"] },
  { href: "/employees", icon: Users, key: "employees", allowed: HR_ROLES },
  { href: "/departments", icon: Building2, key: "departments", allowed: ADMIN },
  { href: "/contractors", icon: Briefcase, key: "contractors", allowed: ADMIN.concat("koordinator") },
  { href: "/reports/standup", icon: FileText, key: "reports", allowed: ALL },
  { href: "/leaves", icon: CalendarDays, key: "leaves", allowed: ALL },
  { href: "/notifications", icon: Bell, key: "notifications", allowed: ALL },
  { href: "/audit-log", icon: ScrollText, key: "auditLog", allowed: ADMIN.concat("hr") },
  { href: "/settings", icon: Settings, key: "settings", allowed: ALL },
];

export function Sidebar({ position }: { position: Position }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const visible = ITEMS.filter((i) => i.allowed.includes(position));

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-[var(--background-elevated)] p-3">
      <nav className="space-y-1">
        {visible.map(({ href, icon: Icon, key }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--accent)]"
              )}
            >
              <Icon className="size-4" />
              <span>{t(key)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
