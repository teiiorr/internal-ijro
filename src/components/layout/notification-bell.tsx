"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { IconBell as Bell, IconChecks as CheckCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { markAllRead } from "@/server/actions/notifications";
import { formatDateTime } from "@/lib/dates";

type Item = {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  // Studiya portalida bildirishnomalar sahifasi /contractor ostida (dashboard yo'q).
  const notifsHref = pathname.startsWith("/contractor") ? "/contractor/notifications" : "/notifications";
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  useEffect(() => { openRef.current = open; }, [open]);
  // Toast takrorlanmasligi uchun oxirgi ko'rilgan bildirishnoma id'si.
  const lastTopRef = useRef<string | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const refreshCount = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications/unread-count", { cache: "no-store" });
      if (r.ok) {
        const j = (await r.json()) as { count: number };
        setUnread(j.count);
      }
    } catch { /* tarmoq xatosi — e'tiborsiz */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications/recent", { cache: "no-store" });
      if (r.ok) {
        const j = (await r.json()) as { items: Item[] };
        setItems(j.items);
        lastTopRef.current = j.items[0]?.id ?? null;
        seededRef.current = true;
      }
    } catch { /* tarmoq xatosi — e'tiborsiz */ }
  }, []);

  // Yangi bildirishnoma signali (SSE) yoki fallback polling kelganda.
  const onIncoming = useCallback(async () => {
    refreshCount();
    try {
      const r = await fetch("/api/notifications/recent", { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as { items: Item[] };
      if (openRef.current) setItems(j.items);
      const top = j.items[0];
      if (top && !top.isRead && top.id !== lastTopRef.current) {
        if (seededRef.current) toast(top.title, { description: top.message ?? undefined });
        lastTopRef.current = top.id;
      }
      seededRef.current = true;
    } catch { /* e'tiborsiz */ }
  }, [refreshCount]);

  // Boshlang'ich hisob + oxirgi bildirishnomani "urug'lash" (mavjudlariga toast chiqmasin).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refreshCount();
      if (!cancelled) await load();
    })();
    return () => { cancelled = true; };
  }, [refreshCount, load]);

  // Fallback: 60 soniyalik polling (SSE ishlamasa ham hisob yangilanadi).
  useEffect(() => {
    const id = setInterval(refreshCount, 60_000);
    return () => clearInterval(id);
  }, [refreshCount]);

  // Real vaqt: SSE oqimi. Xatoda brauzer o'zi qayta ulanadi; polling zaxira bo'lib qoladi.
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/notifications/stream");
      es.addEventListener("notify", () => { onIncoming(); });
    } catch { /* EventSource qo'llab-quvvatlanmasa — polling ishlaydi */ }
    return () => { es?.close(); };
  }, [onIncoming]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) load();
  }

  async function readAll() {
    await markAllRead();
    setUnread(0);
    load();
  }

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="icon" aria-label={t("nav.notifications")} onClick={toggle} className="relative">
        <Bell className="size-5 sm:size-[22px]" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-[6px] bg-[var(--tint)] text-[var(--on-tint)] text-[10px] font-bold tabular flex items-center justify-center ring-2 ring-[var(--surface)]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>
      {open && (
        <div className="fixed left-2 right-2 top-[64px] z-50 rounded-[var(--radius-panel)] glass-strong overflow-hidden sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[380px] sm:max-w-[calc(100vw-1rem)]">
          <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
            <p className="font-bold text-base text-[var(--ink)]">{t("nav.notifications")}</p>
            {unread > 0 && (
              <button onClick={readAll} className="text-xs font-bold text-[var(--tint)] inline-flex items-center gap-1.5 hover:underline">
                <CheckCheck className="size-3.5" /> {t("notifications.markAllRead")}
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-center text-sm text-[var(--ink-2)] font-medium py-10">{t("notifications.empty")}</p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? notifsHref}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block px-5 py-3.5 border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-2)] transition-colors relative",
                    !n.isRead && "bg-[color-mix(in_oklab,var(--tint)_10%,transparent)]"
                  )}
                >
                  {!n.isRead && <span className="absolute left-2 top-1/2 -translate-y-1/2 size-2 rounded-full bg-[var(--tint)]" />}
                  <p className="text-[14px] font-bold leading-snug pl-3 text-[var(--ink)]">{n.title}</p>
                  {n.message && <p className="text-[12px] text-[var(--ink-2)] mt-1 leading-snug line-clamp-2 pl-3 font-medium">{n.message}</p>}
                  <p className="text-[11px] text-[var(--ink-3)] mt-1 tabular pl-3 font-medium">{formatDateTime(n.createdAt, locale)}</p>
                </Link>
              ))
            )}
          </div>
          <div className="px-5 py-3 border-t border-[var(--line)]">
            <Link href={notifsHref} onClick={() => setOpen(false)} className="text-sm text-[var(--tint)] font-bold hover:underline">
              {t("notifications.viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
