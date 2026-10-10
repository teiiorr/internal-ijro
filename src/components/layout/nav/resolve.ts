import { isGroup, type NavConfig, type NavItem, type NavRule, type NavViewer, type ResolvedEntry } from "./types";

export function isAllowed(rule: NavRule, v: NavViewer): boolean {
  switch (rule.kind) {
    case "all":
      return true;
    case "positions":
      return rule.positions.includes(v.position);
    case "flag":
      return v.flags[rule.flag];
    case "owner":
      return v.isOwner;
  }
}

/** Guruh ichidan koʻrinadigan bolalar; bitta bola qolsa — oddiy havolaga aylanadi, bo'sh guruh yashiriladi. */
export function resolveNav(cfg: NavConfig, v: NavViewer): ResolvedEntry[] {
  const out: ResolvedEntry[] = [];
  for (const e of cfg.entries) {
    if (!isGroup(e)) {
      if (isAllowed(e.rule, v)) out.push({ type: "link", item: e, groupKey: null });
      continue;
    }
    const children = e.children.filter((c) => isAllowed(c.rule, v));
    if (children.length === 0) continue;
    if (children.length === 1) out.push({ type: "link", item: children[0]!, groupKey: e.key });
    else out.push({ type: "group", group: e, children });
  }
  return out;
}

const hit = (path: string, p: string) => path === p || path.startsWith(`${p}/`);

/** Eng uzun mos prefiks gʻolib; fallbackMatch faqat hech narsa topilmaganda. */
export function activeKey(pathname: string, visible: NavItem[], v: NavViewer): string | null {
  let best: { key: string; len: number } | null = null;
  for (const it of visible) {
    const paths = [it.href, ...(it.views ?? []).filter((w) => !w.rule || isAllowed(w.rule, v)).map((w) => w.href)];
    for (const p of paths) if (hit(pathname, p) && (!best || p.length > best.len)) best = { key: it.key, len: p.length };
  }
  if (best) return best.key;
  return visible.find((it) => it.fallbackMatch?.some((p) => hit(pathname, p)))?.key ?? null;
}

/** resolveNav natijasidan faqat havola/bola NavItem'larini yassilaydi (activeKey uchun). */
export function visibleItems(entries: ResolvedEntry[]): NavItem[] {
  const out: NavItem[] = [];
  for (const e of entries) {
    if (e.type === "link") out.push(e.item);
    else out.push(...e.children);
  }
  return out;
}
