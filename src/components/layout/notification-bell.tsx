"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
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
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const r = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        if (!cancelled && r.ok) {
          const j = (await r.json()) as { count: number };
          setUnread(j.count);
        }
      } catch {}
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  async function load() {
    try {
      const r = await fetch("/api/notifications/recent", { cache: "no-store" });
      if (r.ok) {
        const j = (await r.json()) as { items: Item[] };
        setItems(j.items);
      }
    } catch {}
  }

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
      <Button variant="ghost" size="icon" aria-label={t("nav.notifications")} onClick={toggle}>
        <Bell className="size-[19px]" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--danger)] text-white text-[10px] font-bold tabular flex items-center justify-center ring-2 ring-[var(--background-elevated)]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-1rem)] rounded-2xl border border-[var(--border)] bg-[var(--popover)] shadow-lifted z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <p className="font-display font-bold">{t("nav.notifications")}</p>
            {unread > 0 && (
              <button onClick={readAll} className="text-xs font-medium text-[var(--primary)] inline-flex items-center gap-1 hover:underline">
                <CheckCheck className="size-3.5" /> {t("notifications.markAllRead")}
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-center text-sm text-[var(--muted)] py-8">{t("notifications.empty")}</p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "/notifications"}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-3)] transition-colors relative",
                    !n.isRead && "bg-[var(--primary-soft)]/40"
                  )}
                >
                  {!n.isRead && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-[var(--primary)]" />}
                  <p className="text-[14px] font-medium leading-snug">{n.title}</p>
                  {n.message && <p className="text-[12px] text-[var(--muted)] mt-1 leading-snug line-clamp-2">{n.message}</p>}
                  <p className="text-[11px] text-[var(--subtle)] mt-1 tabular">{formatDateTime(n.createdAt)}</p>
                </Link>
              ))
            )}
          </div>
          <div className="px-4 py-2 border-t border-[var(--border)]">
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-sm text-[var(--primary)] font-medium hover:underline">
              Hammasini ko'rish →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
