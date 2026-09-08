"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { IconArrowRight as ArrowRight, IconChevronDown as Chevron, IconUsers as Users } from "@tabler/icons-react";
import { BackButton } from "@/components/ui/back-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SmoothImage } from "@/components/ui/smooth-image";
import { ProjectChat } from "@/components/projects/project-chat";
import { markProjectRead } from "@/server/actions/projects";

type Msg = {
  id: string;
  content: string;
  createdAt: Date | string;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  attachments?: unknown;
};
export type Member = { id: string; name: string; role: string; avatarUrl: string | null };

/**
 * Full-screen, Telegram-style GROUP conversation: the project is the group, its
 * BKRM curator(s) + the studio are the members. Covers the whole viewport with
 * one glass header; tapping the header reveals the members list.
 */
export function ConversationScreen({
  title,
  avatarUrl,
  backHref,
  members = [],
  openHref,
  openLabel,
  projectId,
  stageId = null,
  messages,
  currentUserId,
  currentUserName,
  maxBytes,
}: {
  title: string;
  avatarUrl?: string | null;
  backHref: string;
  members?: Member[];
  openHref?: string;
  openLabel?: string;
  projectId: string;
  stageId?: string | null;
  messages: Msg[];
  currentUserId: string;
  currentUserName?: string;
  maxBytes?: number;
}) {
  const t = useTranslations();
  const [membersOpen, setMembersOpen] = useState(false);

  // Opening the group marks its incoming messages read (clears the unread badge
  // on the chats list + nav once you navigate back).
  useEffect(() => {
    markProjectRead(projectId).catch(() => {});
  }, [projectId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--background)]">
      <header className="glass-bar relative z-10 shrink-0 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 px-2 pb-2 sm:px-3">
          <BackButton fallbackHref={backHref} className="shrink-0" />
          {/* Tap the group identity → members list (Telegram group-info pattern). */}
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
                {members.length > 0
                  ? members.map((m) => m.name).join(", ")
                  : `${members.length} ${t("conversation.participants")}`}
                <Chevron className={`size-3 shrink-0 transition-transform ${membersOpen ? "rotate-180" : ""}`} />
              </p>
            </div>
          </button>
          {openHref && (
            <Link
              href={openHref}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--foreground)]"
            >
              {openLabel ?? t("contractor.openStage")}
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>

        {/* Members panel */}
        {membersOpen && (
          <div className="absolute inset-x-0 top-full max-h-[60dvh] overflow-y-auto border-b border-[var(--border)] glass-strong px-3 py-3 shadow-[var(--shadow-2)] sm:px-4">
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

      {/* Tap-away to close the members panel */}
      {membersOpen && <div className="absolute inset-0 z-0" onClick={() => setMembersOpen(false)} aria-hidden />}

      <div className="min-h-0 flex-1">
        <ProjectChat
          fill
          projectId={projectId}
          stageId={stageId}
          messages={messages.map((m) => ({ ...m, createdAt: m.createdAt as Date }))}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          maxBytes={maxBytes}
        />
      </div>
    </div>
  );
}
