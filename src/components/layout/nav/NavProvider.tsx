"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { STAFF_NAV } from "./staff-nav";
import { STUDIO_NAV } from "./studio-nav";
import { activeKey as computeActiveKey, resolveNav, visibleItems } from "./resolve";
import type { NavViewer, ResolvedEntry } from "./types";

export type NavBadges = { reviewQueue?: number; chatUnread?: number };

type NavContextValue = {
  portal: "staff" | "studio";
  entries: ResolvedEntry[];
  badges: NavBadges;
  activeKey: string | null;
  activeGroupKey: string | null;
  isOpen: (groupKey: string) => boolean;
  toggle: (groupKey: string) => void;
};

const NavContext = createContext<NavContextValue | null>(null);

function writeCookie(open: string[]) {
  try {
    document.cookie = `ijro_nav_open=${open.join(",")}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    /* cookie bloklangan — e'tiborsiz */
  }
}

export function NavProvider({
  portal,
  viewer,
  badges,
  initialOpen,
  children,
}: {
  portal: "staff" | "studio";
  viewer: NavViewer;
  badges: NavBadges;
  initialOpen: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const entries = useMemo(() => resolveNav(portal === "staff" ? STAFF_NAV : STUDIO_NAV, viewer), [portal, viewer]);

  const activeKey = useMemo(
    () => computeActiveKey(pathname, visibleItems(entries), viewer),
    [pathname, entries, viewer],
  );
  const activeGroupKey = useMemo(() => {
    for (const e of entries) if (e.type === "group" && e.children.some((c) => c.key === activeKey)) return e.group.key;
    return null;
  }, [entries, activeKey]);

  // Boshlang'ich ochiq to'plam: cookie + faol guruh. Birinchi bo'yoqda to'g'ri guruhlar ochiq.
  const [open, setOpen] = useState<Set<string>>(() => {
    const s = new Set(initialOpen);
    if (activeGroupKey) s.add(activeGroupKey);
    return s;
  });

  const toggle = useCallback((groupKey: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      writeCookie([...next]);
      return next;
    });
  }, []);

  // Marshrut guruh ichiga kirsa, o'sha guruh ochiladi (foydalanuvchi keyin yiga oladi).
  const isOpen = useCallback(
    (groupKey: string) => open.has(groupKey) || groupKey === activeGroupKey,
    [open, activeGroupKey],
  );

  const value = useMemo<NavContextValue>(
    () => ({ portal, entries, badges, activeKey, activeGroupKey, isOpen, toggle }),
    [portal, entries, badges, activeKey, activeGroupKey, isOpen, toggle],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav NavProvider ichida ishlatilishi kerak");
  return ctx;
}
