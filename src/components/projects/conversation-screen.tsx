"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  IconArrowRight as ArrowRight, IconChevronDown as Chevron, IconUsers as Users,
  IconHash as Hash, IconMessages as Messages,
} from "@tabler/icons-react";
import { BackButton } from "@/components/ui/back-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SmoothImage } from "@/components/ui/smooth-image";
import { ProjectChat } from "@/components/projects/project-chat";
import { markProjectRead } from "@/server/actions/projects";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  content: string;
  createdAt: Date | string;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  attachments?: unknown;
  editedAt?: Date | string | null;
  replyToId?: string | null;
  replyToContent?: string | null;
  replyToUserName?: string | null;
  readByCuratorAt?: Date | string | null;
  readByContractorAt?: Date | string | null;
};
export type Member = { id: string; name: string; role: string; avatarUrl: string | null };
/** Bir suhbat kanali: umumiy (stageId=null) yoki bitta bosqiç. */
export type Channel = { stageId: string | null; label: string; messages: Msg[] };

/**
 * Töliq ekranli, Telegram uslubidagi GURUH suhbati. Har bir loyiha bosqiçi alohida
 * kanal (chat), pastda "Umumiy masalalar" kanali bilan birga; ustdagi tanlagichdan
 * kanal almaştiriladi. Butun ekranni qoplaydi — document.body'ga portal qilinadi,
 * şu bois sahifa animatsiyasi (transform/filter) fixed joylaşuvni buzmaydi.
 */
export function ConversationScreen({
  title,
  avatarUrl,
  backHref,
  members = [],
  openHref,
  openLabel,
  projectId,
  channels,
  currentUserId,
  currentUserName,
  maxBytes,
  readOnly = false,
  canModerate = false,
  viewerIsContractor = false,
}: {
  title: string;
  avatarUrl?: string | null;
  backHref: string;
  members?: Member[];
  openHref?: string;
  openLabel?: string;
  projectId: string;
  channels: Channel[];
  currentUserId: string;
  currentUserName?: string;
  maxBytes?: number;
  readOnly?: boolean;
  canModerate?: boolean;
  viewerIsContractor?: boolean;
}) {
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [selKey, setSelKey] = useState<string>("general");
  const activeChipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => { markProjectRead(projectId).catch(() => {}); }, [projectId]);
  // Tanlangan kanal chipini ko'rinadigan joyga suramiz (uzun bosqichlar ro'yxatida).
  useEffect(() => {
    activeChipRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selKey, mounted]);

  const list = channels.length ? channels : [{ stageId: null, label: t("conversation.general"), messages: [] as Msg[] }];
  const keyOf = (c: Channel) => c.stageId ?? "general";
  const selected = list.find((c) => keyOf(c) === selKey) ?? list[0];

  const content = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--background)]">
      <header className="glass-bar relative z-10 shrink-0 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 px-2 pb-1 sm:px-3">
          <BackButton fallbackHref={backHref} className="shrink-0" />
          <button type="button" onClick={() => setMembersOpen((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 text-left transition-colors active:bg-[var(--glass-fill)]">
            <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-[var(--surface-2)]">
              {avatarUrl ? (
                <SmoothImage src={avatarUrl} alt={title} className="size-full object-cover object-[center_25%]" />
              ) : (
                <div className="grid size-full place-items-center"><Users className="size-5 text-[var(--subtle)]" /></div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-bold leading-tight sm:text-base">{title}</h1>
              <p className="flex items-center gap-1 truncate text-xs text-[var(--muted)]">
                {members.length > 0 ? members.map((m) => m.name).join(", ") : `${members.length} ${t("conversation.participants")}`}
                <Chevron className={`size-3 shrink-0 transition-transform ${membersOpen ? "rotate-180" : ""}`} />
              </p>
            </div>
          </button>
          {readOnly && (
            <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">{t("conversation.readOnly")}</span>
          )}
          {openHref && (
            <Link href={openHref} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--foreground)]">
              {openLabel ?? t("contractor.openStage")}
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>

        {/* Kanal tanlagich — rangli, katta va doim ko'rinadigan chiplar qatori (bosqichlar + Umumiy). */}
        <div className="border-t border-[var(--primary)]/20 bg-[var(--primary-soft)] px-2 pb-2.5 pt-2 sm:px-3">
          <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-[var(--primary)]">
            <Hash className="size-3.5" /> {t("conversation.channels")} · {list.length}
          </p>
          <div className="-mx-2 flex snap-x gap-2 overflow-x-auto px-2 pb-0.5 [scrollbar-width:none] sm:-mx-3 sm:px-3 [&::-webkit-scrollbar]:hidden">
            {list.map((c) => {
              const k = keyOf(c);
              const active = k === keyOf(selected);
              return (
                <button
                  key={k}
                  ref={active ? activeChipRef : undefined}
                  type="button"
                  onClick={() => setSelKey(k)}
                  aria-pressed={active}
                  className={cn(
                    "flex shrink-0 snap-start items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all active:scale-[0.97]",
                    active
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-[0_6px_18px_-6px_var(--primary-glow)]"
                      : "border-[var(--primary)]/25 bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--primary)]"
                  )}
                >
                  {c.stageId ? <Hash className="size-4 shrink-0" /> : <Messages className="size-4 shrink-0" />}
                  <span className="max-w-[200px] truncate sm:max-w-[260px]">{c.label}</span>
                  {c.messages.length > 0 && (
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums", active ? "bg-white/25 text-white" : "bg-[var(--surface-2)] text-[var(--muted)]")}>
                      {c.messages.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Aʼzolar paneli */}
        {membersOpen && (
          <div className="absolute inset-x-0 top-full z-20 max-h-[60dvh] overflow-y-auto border-b border-[var(--border)] glass-strong px-3 py-3 shadow-[var(--shadow-2)] sm:px-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]"><Users className="size-3.5" />{t("conversation.members")} · {members.length}</p>
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5">
                  <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="sm" clickable={false} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {membersOpen && <div className="absolute inset-0 z-0" onClick={() => setMembersOpen(false)} aria-hidden />}

      <div className="min-h-0 flex-1">
        <ProjectChat
          key={keyOf(selected)}
          fill
          readOnly={readOnly}
          canModerate={canModerate}
          viewerIsContractor={viewerIsContractor}
          projectId={projectId}
          stageId={selected.stageId}
          messages={selected.messages.map((m) => ({ ...m, createdAt: m.createdAt as Date }))}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          maxBytes={maxBytes}
        />
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
