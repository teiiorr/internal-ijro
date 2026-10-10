"use client";
import { useState } from "react";
import { IconAddressBook, IconSitemap, type Icon as TablerIcon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export type StaffTab = "tuzilma" | "malumotnoma";

/**
 * /tuzilma sahifasidagi ikki koʻrinish. Tanlangan koʻrinish ?tab= parametrida saqlanadi
 * (history.replaceState — server qayta render qilinmaydi, havolani ulashish mumkin).
 * Boshqaruv — xotirjam segment (oyna emas, kapsula emas): --surface-2 yoʻlak, faol = --surface.
 */
export function StaffTabs({
  initialTab,
  treeLabel,
  directoryLabel,
  tree,
  directory,
}: {
  initialTab: StaffTab;
  treeLabel: string;
  directoryLabel: string;
  tree: React.ReactNode;
  directory: React.ReactNode;
}) {
  const [tab, setTab] = useState<StaffTab>(initialTab);

  function select(next: StaffTab) {
    setTab(next);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* URL yangilanmasa ham koʻrinish ishlayveradi */
    }
  }

  const items: { value: StaffTab; label: string; icon: TablerIcon }[] = [
    { value: "tuzilma", label: treeLabel, icon: IconSitemap },
    { value: "malumotnoma", label: directoryLabel, icon: IconAddressBook },
  ];

  return (
    <div>
      <div
        role="tablist"
        aria-label={treeLabel}
        className="inline-flex max-w-full items-center gap-1 rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] p-1 max-sm:flex max-sm:w-full print:hidden"
      >
        {items.map((it) => {
          const active = tab === it.value;
          const Icon = it.icon;
          return (
            <button
              key={it.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => select(it.value)}
              className={cn(
                "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 text-[0.8125rem] font-semibold transition-colors sm:flex-none",
                active
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-1)]"
                  : "text-[var(--ink-2)] hover:text-[var(--ink)]",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {it.label}
            </button>
          );
        })}
      </div>
      <div className="mt-6">{tab === "tuzilma" ? tree : directory}</div>
    </div>
  );
}
