"use client";

import { IconChevronRight } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Surface } from "@/components/glass/Surface";
import { cn } from "@/lib/utils";
import { useNav, type NavBadges } from "./NavProvider";
import type { NavItem } from "./types";

function badgeValue(item: NavItem, badges: NavBadges): number {
  if (item.badge === "reviewQueue") return badges.reviewQueue ?? 0;
  if (item.badge === "chatUnread") return badges.chatUnread ?? 0;
  return 0;
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-[6px] bg-tint px-1.5 text-[11px] font-bold tabular-nums text-on-tint">
      {n > 99 ? "99+" : n}
    </span>
  );
}

function Row({ item, child }: { item: NavItem; child?: boolean }) {
  const t = useTranslations();
  const { activeKey, badges } = useNav();
  const active = activeKey === item.key;
  const Icon = item.icon;
  const n = badgeValue(item, badges);
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group/row relative flex items-center gap-3 rounded-[12px] px-3 transition-colors",
          child ? "h-11 text-[15px] font-medium" : "h-12 text-[16px] font-semibold",
          active
            ? "bg-[var(--surface-2)] text-ink before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-[2px] before:bg-tint before:content-['']"
            : "text-ink-2 hover:bg-[var(--surface-2)] hover:text-ink",
        )}
      >
        <Icon className={cn("size-5 shrink-0", active ? "text-tint" : "text-ink-3 group-hover/row:text-ink-2")} stroke={1.75} />
        <span className="flex-1 truncate">{t(item.labelKey as "nav.dashboard")}</span>
        <Badge n={n} />
      </Link>
    </li>
  );
}

export function Sidebar() {
  const t = useTranslations();
  const { entries, activeKey, isOpen, toggle, badges } = useNav();

  return (
    <aside className="hidden md:block w-[17rem] shrink-0">
      <div className="sticky top-[88px] m-4">
        <Surface
          as="nav"
          radius="panel"
          padding={12}
          aria-label={t("nav.menu")}
          className="max-h-[calc(100vh-110px)] overflow-y-auto overscroll-contain"
        >
          <ul className="flex flex-col gap-0.5">
            {entries.map((e) => {
              if (e.type === "link") return <Row key={e.item.key} item={e.item} />;
              const open = isOpen(e.group.key);
              const GroupIcon = e.group.icon;
              const hasActiveInside = e.children.some((c) => c.key === activeKey);
              const groupBadge = e.children.reduce((sum, c) => sum + badgeValue(c, badges), 0);
              return (
                <li key={e.group.key}>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`nav-g-${e.group.key}`}
                    onClick={() => toggle(e.group.key)}
                    className={cn(
                      "flex h-12 w-full items-center gap-3 rounded-[12px] px-3 text-[16px] font-semibold transition-colors",
                      open && "bg-[var(--surface-2)]",
                      hasActiveInside ? "text-ink" : "text-ink-2 hover:bg-[var(--surface-2)] hover:text-ink",
                    )}
                  >
                    <GroupIcon className={cn("size-5 shrink-0", hasActiveInside ? "text-tint" : "text-ink-3")} stroke={1.75} />
                    <span className="flex-1 truncate text-left">{t(e.group.labelKey as "nav.group.work")}</span>
                    {!open && groupBadge > 0 && <Badge n={groupBadge} />}
                    {!open && groupBadge === 0 && hasActiveInside && <span className="size-1.5 rounded-full bg-tint" aria-hidden />}
                    <IconChevronRight className={cn("size-4 shrink-0 text-ink-3 transition-transform duration-200", open && "rotate-90")} stroke={2} />
                  </button>
                  <div
                    className="grid transition-[grid-template-rows] duration-200 ease-out"
                    style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                  >
                    <ul id={`nav-g-${e.group.key}`} inert={!open} className="min-h-0 overflow-hidden pl-7">
                      {e.children.map((c) => (
                        <Row key={c.key} item={c} child />
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </Surface>
      </div>
    </aside>
  );
}
