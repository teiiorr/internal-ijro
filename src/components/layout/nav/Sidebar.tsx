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
    <span className="ml-auto grid h-6 min-w-6 place-items-center rounded-[6px] bg-tint px-1.5 text-[12px] font-bold tabular-nums text-on-tint">
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
          "group/row flex items-center gap-3 rounded-[12px] px-3.5 transition-colors",
          child ? "h-12 text-[16px] font-semibold" : "h-[54px] text-[17px] font-bold",
          active
            ? "bg-[var(--glass-fill-strong)] text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]"
            : "text-ink-2 hover:bg-[var(--glass-fill)] hover:text-ink",
        )}
      >
        <Icon className={cn("size-[22px] shrink-0", active ? "text-tint" : "text-ink-3 group-hover/row:text-ink-2")} stroke={1.85} />
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
    <aside className="hidden w-[300px] shrink-0 md:flex">
      {/* Panel vertikal markazda — ekranda balansli, "juda tepada" emas. */}
      <div className="sticky top-[84px] flex h-[calc(100svh-84px)] items-center py-4 pl-4">
        <Surface
          as="nav"
          radius="panel"
          padding={14}
          aria-label={t("nav.menu")}
          className="max-h-full w-full overflow-y-auto overscroll-contain"
        >
          <ul className="flex flex-col gap-1">
            {entries.map((e) => {
              if (e.type === "link") return <Row key={e.item.key} item={e.item} />;
              const open = isOpen(e.group.key);
              const GroupIcon = e.group.icon;
              const hasActiveInside = e.children.some((c) => c.key === activeKey);
              const hiddenBadge = !open && e.children.some((c) => badgeValue(c, badges) > 0);
              return (
                <li key={e.group.key}>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`nav-g-${e.group.key}`}
                    onClick={() => toggle(e.group.key)}
                    className={cn(
                      "flex h-[54px] w-full items-center gap-3 rounded-[12px] px-3.5 text-[17px] font-bold transition-colors",
                      hasActiveInside && !open ? "text-ink" : "text-ink-2 hover:bg-[var(--glass-fill)] hover:text-ink",
                    )}
                  >
                    <GroupIcon className={cn("size-[22px] shrink-0", hasActiveInside ? "text-tint" : "text-ink-3")} stroke={1.85} />
                    <span className="flex-1 truncate text-left">{t(e.group.labelKey as "nav.group.work")}</span>
                    {!open && (hasActiveInside || hiddenBadge) && <span className="size-2 rounded-full bg-tint" aria-hidden />}
                    <IconChevronRight className={cn("size-[18px] shrink-0 text-ink-3 transition-transform duration-200", open && "rotate-90")} stroke={2.25} />
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
