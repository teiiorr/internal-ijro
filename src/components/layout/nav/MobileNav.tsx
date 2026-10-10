"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useNav, type NavBadges } from "./NavProvider";
import { STAFF_FULLSCREEN, STUDIO_FULLSCREEN } from "./studio-nav";
import type { NavItem } from "./types";

function badgeValue(item: NavItem, badges: NavBadges): number {
  if (item.badge === "reviewQueue") return badges.reviewQueue ?? 0;
  if (item.badge === "chatUnread") return badges.chatUnread ?? 0;
  return 0;
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="grid h-5 min-w-5 place-items-center rounded-[6px] bg-tint px-1.5 text-[11px] font-bold tabular-nums text-on-tint">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function MobileNav() {
  const t = useTranslations();
  const pathname = usePathname();
  const { portal, tabItems, entries, activeKey, badges } = useNav();
  const [open, setOpen] = useState(false);

  // Marshrut o'zgarsa varaq yopiladi.
  useEffect(() => { setOpen(false); }, [pathname]);

  // To'liq ekranli suhbatda pastki panel yashiriladi.
  const fullscreen = (portal === "studio" ? STUDIO_FULLSCREEN : STAFF_FULLSCREEN).test(pathname);
  if (fullscreen) return null;

  const tabKeys = new Set(tabItems.map((i) => i.key));
  const menuActive = !activeKey || !tabKeys.has(activeKey);
  const hiddenBadge = entries.some((e) =>
    e.type === "group"
      ? e.children.some((c) => !tabKeys.has(c.key) && badgeValue(c, badges) > 0)
      : !tabKeys.has(e.item.key) && badgeValue(e.item, badges) > 0,
  );

  const cell = (active: boolean) =>
    cn("relative flex min-w-0 flex-col items-center justify-center gap-1 py-2.5 transition-colors", active ? "text-tint" : "text-ink-3");

  return (
    <>
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-tabbar px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        <ul
          className="grid overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--glass-fill-strong)] shadow-[var(--shadow-floating)] backdrop-blur-xl backdrop-saturate-150"
          style={{ gridTemplateColumns: `repeat(${tabItems.length + 1}, minmax(0, 1fr))` }}
        >
          {tabItems.map((item) => {
            const active = activeKey === item.key;
            const Icon = item.icon;
            const n = badgeValue(item, badges);
            return (
              <li key={item.key} className="min-w-0">
                <Link href={item.href} className={cell(active)} aria-current={active ? "page" : undefined}>
                  <span className="relative">
                    <Icon className="size-6 shrink-0" stroke={1.75} />
                    {n > 0 && <span className="absolute -right-2 -top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-[5px] bg-tint px-1 text-[10px] font-bold tabular-nums text-on-tint">{n > 99 ? "99+" : n}</span>}
                  </span>
                  <span className="max-w-full truncate px-0.5 text-[11px] font-semibold leading-none">
                    {t((item.shortLabelKey ?? item.labelKey) as "nav.dashboard")}
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0">
            <button type="button" onClick={() => setOpen(true)} className={cn(cell(menuActive || open), "w-full")} aria-haspopup="dialog">
              <span className="relative">
                <IconMenu2 className="size-6 shrink-0" stroke={1.75} />
                {hiddenBadge && <span className="absolute -right-1.5 -top-1 size-2 rounded-full bg-tint" aria-hidden />}
              </span>
              <span className="max-w-full truncate px-0.5 text-[11px] font-semibold leading-none">{t("nav.menu")}</span>
            </button>
          </li>
        </ul>
      </nav>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="md:hidden fixed inset-0 z-overlay bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content
            className="md:hidden fixed inset-x-0 bottom-0 z-modal flex max-h-[85dvh] flex-col rounded-t-[24px] border-t border-[var(--line)] bg-[var(--glass-fill-strong)] shadow-[var(--shadow-overlay)] backdrop-blur-2xl backdrop-saturate-150 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
          >
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <Dialog.Title className="t-h3 text-ink">{t("nav.menu")}</Dialog.Title>
              <Dialog.Close aria-label={t("common.close")} className="grid size-9 place-items-center rounded-[12px] text-ink-3 hover:bg-[var(--surface-2)] hover:text-ink transition-colors">
                <IconX className="size-5" />
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
              {entries.map((e) => {
                if (e.type === "link") return <SheetRow key={e.item.key} item={e.item} active={activeKey === e.item.key} badges={badges} />;
                return (
                  <section key={e.group.key}>
                    <p className="mb-1.5 flex items-center gap-2 px-1 text-[13px] font-bold uppercase tracking-wide text-ink-3">
                      <e.group.icon className="size-4" stroke={1.75} /> {t(e.group.labelKey as "nav.group.work")}
                    </p>
                    <ul className="space-y-1">
                      {e.children.map((c) => (
                        <SheetRow key={c.key} item={c} active={activeKey === c.key} badges={badges} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function SheetRow({ item, active, badges }: { item: NavItem; active: boolean; badges: NavBadges }) {
  const t = useTranslations();
  const Icon = item.icon;
  const n = badgeValue(item, badges);
  return (
    <li className="list-none">
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-[52px] items-center gap-3 rounded-[16px] px-3 text-[16px] font-semibold transition-colors",
          active
            ? "bg-[var(--surface-2)] text-ink before:absolute before:left-0 before:top-1/2 before:h-6 before:w-0.5 before:-translate-y-1/2 before:rounded-[2px] before:bg-tint before:content-['']"
            : "text-ink-2 hover:bg-[var(--surface-2)] hover:text-ink",
        )}
      >
        <Icon className={cn("size-5 shrink-0", active ? "text-tint" : "text-ink-3")} stroke={1.75} />
        <span className="flex-1 truncate">{t(item.labelKey as "nav.dashboard")}</span>
        <Badge n={n} />
      </Link>
    </li>
  );
}
