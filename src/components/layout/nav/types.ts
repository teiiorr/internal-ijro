import type { ComponentType } from "react";
import type { Position } from "@/lib/db/schema";

/** @tabler/icons-react belgisi. */
export type TablerIcon = ComponentType<{ size?: number; stroke?: number; className?: string }>;

/** Asinxron tekshiruvlar layoutda bir marta hisoblanadi. */
export type NavFlags = { contractors: boolean; money: boolean; reports: boolean };
export type NavViewer = { position: Position; isOwner: boolean; flags: NavFlags };

export type NavRule =
  | { kind: "all" }
  | { kind: "positions"; positions: readonly Position[] }
  | { kind: "flag"; flag: keyof NavFlags }
  | { kind: "owner" };

export type NavBadge = "reviewQueue" | "chatUnread";

/** Sahifa ichidagi koʻrinish yoki tab: menyuda chizilmaydi, faollik va qidiruv uchun. */
export type NavView = { key: string; href: string; labelKey: string; rule?: NavRule };

export type NavItem = {
  key: string;
  href: string;
  labelKey: string;
  shortLabelKey?: string;
  icon: TablerIcon;
  rule: NavRule;
  views?: NavView[];
  fallbackMatch?: string[];
  badge?: NavBadge;
};

export type NavGroup = { key: string; labelKey: string; icon: TablerIcon; children: NavItem[] };
export type NavEntry = NavItem | NavGroup;
export const isGroup = (e: NavEntry): e is NavGroup => "children" in e;

export type NavConfig = {
  portal: "staff" | "studio";
  entries: NavEntry[];
  tabBar: string[];
  paletteExtras?: { parentKey: string | null; item: NavItem }[];
};

export type ResolvedEntry =
  | { type: "link"; item: NavItem; groupKey: string | null }
  | { type: "group"; group: NavGroup; children: NavItem[] };
