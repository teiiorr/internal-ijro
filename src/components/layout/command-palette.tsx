"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  IconSearch as Search,
  IconFolder as Folder,
  IconClipboardList as Task,
  IconUser as User,
  IconBuildingStore as Studio,
  IconTrophy as Trophy,
  IconCornerDownLeft as Enter,
} from "@tabler/icons-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Hit = { id: string; label: string; sub: string | null; href: string };
type Results = { projects: Hit[]; tasks: Hit[]; employees: Hit[]; studios: Hit[]; contests: Hit[] };
const EMPTY: Results = { projects: [], tasks: [], employees: [], studios: [], contests: [] };

const GROUP_META = [
  { key: "projects", icon: Folder },
  { key: "tasks", icon: Task },
  { key: "employees", icon: User },
  { key: "studios", icon: Studio },
  { key: "contests", icon: Trophy },
] as const;

export function CommandPalette() {
  const t = useTranslations("commandPalette");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const openRef = useRef(false);
  useEffect(() => { openRef.current = open; }, [open]);

  const handleOpenChange = useCallback((o: boolean) => {
    setOpen(o);
    if (!o) { setQ(""); setResults(EMPTY); setActive(0); setLoading(false); }
  }, []);

  // ⌘K / Ctrl+K — ochish/yopish (forma maydonlarida ham ishlaydi).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleOpenChange(!openRef.current);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleOpenChange]);

  // Debounced qidiruv + oldingi so'rovni bekor qilish. Barcha holat o'zgarishlari
  // kechiktirilgan callback ichida (effekt tanasida emas).
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      if (term.length < 2) { setResults(EMPTY); setLoading(false); return; }
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal, cache: "no-store" });
        if (r.ok) {
          const j = (await r.json()) as { results: Results };
          setResults(j.results ?? EMPTY);
          setActive(0);
        }
      } catch {
        /* abort yoki tarmoq xatosi — e'tiborsiz */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [q, open]);

  // Klaviatura navigatsiyasi uchun natijalarni tekis ro'yxatga yig'amiz.
  const flat = useMemo(() => GROUP_META.flatMap((g) => results[g.key]), [results]);
  const total = flat.length;

  const go = useCallback((href: string) => { handleOpenChange(false); router.push(href); }, [handleOpenChange, router]);

  function onQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQ(v);
    setLoading(v.trim().length >= 2);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (total === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % total); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + total) % total); }
    else if (e.key === "Enter") { e.preventDefault(); const h = flat[active]; if (h) go(h.href); }
  }

  const term = q.trim();
  let flatIndex = -1;

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        aria-label={t("open")}
        className="flex items-center gap-2 rounded-full border border-[var(--input)] bg-[var(--glass-fill)] px-3 h-9 text-[13px] font-medium text-[var(--subtle)] hover:border-[var(--primary)] hover:text-[var(--foreground)] transition-colors"
      >
        <Search className="size-4" />
        <span className="hidden md:inline">{t("open")}</span>
        <kbd className="hidden md:inline rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-bold">Ctrl + K</kbd>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="top-[8%] sm:top-[12%] translate-y-0 w-[calc(100vw-1.25rem)] max-w-xl p-0 gap-0 overflow-hidden">
          <DialogTitle className="sr-only">{t("open")}</DialogTitle>
          <div className="flex items-center gap-2.5 border-b border-[var(--border)] pl-4 pr-14">
            <Search className="size-5 shrink-0 text-[var(--subtle)]" />
            <input
              autoFocus
              value={q}
              onChange={onQueryChange}
              onKeyDown={onInputKey}
              placeholder={t("placeholder")}
              className="h-14 w-full bg-transparent text-[15px] font-medium placeholder:text-[var(--subtle)] focus:outline-none"
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {term.length < 2 ? (
              <p className="px-3 py-8 text-center text-sm text-[var(--muted)]">{t("hint")}</p>
            ) : total === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-[var(--muted)]">{loading ? t("searching") : t("noResults")}</p>
            ) : (
              GROUP_META.map(({ key, icon: Icon }) => {
                const hits = results[key];
                if (hits.length === 0) return null;
                return (
                  <div key={key} className="mb-1.5 last:mb-0">
                    <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-[var(--subtle)]">
                      {t(`groups.${key}` as "groups.projects")}
                    </p>
                    {hits.map((h) => {
                      flatIndex += 1;
                      const isActive = flatIndex === active;
                      const idx = flatIndex;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => go(h.href)}
                          onMouseEnter={() => setActive(idx)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                            isActive ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--glass-fill)]"
                          )}
                        >
                          <Icon className="size-4 shrink-0 text-[var(--muted)]" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[var(--foreground)]">{h.label}</span>
                            {h.sub && <span className="block truncate text-xs text-[var(--muted)]">{h.sub}</span>}
                          </span>
                          {isActive && <Enter className="size-3.5 shrink-0 text-[var(--primary)]" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
