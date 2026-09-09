"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { IconUser as UserIcon, IconSearch as Search } from "@tabler/icons-react";
import { SmoothImage } from "@/components/ui/smooth-image";
import { formatChatTime } from "@/lib/dates";
import { shortName } from "@/lib/names";

type Chat = {
  id: string;
  name: string;
  posterUrl: string | null;
  curator: { fullName: string; avatarUrl: string | null } | null;
  lastMessage: { content: string; createdAt: Date | string; userName: string | null } | null;
  unread: number;
};

export function ChatsList({ chats }: { chats: Chat[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return chats;
    return chats.filter((c) => c.name.toLowerCase().includes(term) || (c.curator?.fullName ?? "").toLowerCase().includes(term));
  }, [q, chats]);

  return (
    <div className="space-y-3">
      {/* Yopişib turadigan xira şişa qidiruvi — ilova header'i ostida töliq enda. */}
      <div className="sticky top-[68px] z-20 -mx-3 glass-soft px-3 py-2 sm:-mx-4 sm:top-[84px] sm:px-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--subtle)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("common.search")}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            className="h-12 w-full rounded-2xl border border-[var(--input)] bg-[var(--surface-1)] pl-10 pr-3 text-base text-[var(--foreground)] placeholder:text-[var(--subtle)] transition-colors focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)]"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--muted)]">{t("common.noResults")}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {shown.map((c, i) => (
            <Link
              key={c.id}
              href={`/contractor/chats/${c.id}`}
              className={`flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--glass-fill)] active:bg-[var(--glass-fill)] ${i > 0 ? "border-t border-[var(--border)]" : ""}`}
            >
              <div className="relative shrink-0 overflow-hidden rounded-full bg-[var(--surface-2)]" style={{ width: 52, height: 52 }}>
                {c.posterUrl ? (
                  <SmoothImage src={c.posterUrl} alt={c.name} className="size-full object-cover object-[center_25%]" />
                ) : (
                  <div className="grid size-full place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                    <span className="text-xl font-black text-[var(--subtle)]">{c.name.trim().charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[15px] font-bold">{c.name}</p>
                  {c.lastMessage && (
                    <span className={`shrink-0 text-[11px] tabular-nums ${c.unread > 0 ? "font-semibold text-[var(--primary)]" : "text-[var(--subtle)]"}`}>{formatChatTime(c.lastMessage.createdAt, locale)}</span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className={`min-w-0 flex-1 truncate text-sm ${c.unread > 0 ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                    {c.lastMessage
                      ? `${c.lastMessage.userName ? shortName(c.lastMessage.userName) + ": " : ""}${c.lastMessage.content}`
                      : c.curator
                        ? `${t("contractor.chats.curator")}: ${shortName(c.curator.fullName)}`
                        : t("contractor.chats.noMessages")}
                  </p>
                  {c.unread > 0 && (
                    <span className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-[var(--primary)] px-1.5 text-[11px] font-bold text-white tabular-nums">
                      {c.unread > 99 ? "99+" : c.unread}
                    </span>
                  )}
                </div>
                {!c.curator && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[var(--warning)]"><UserIcon className="size-3.5" />{t("contractor.chats.noCurator")}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
