"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { IconArrowRight as ArrowRight } from "@tabler/icons-react";
import { BackButton } from "@/components/ui/back-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ProjectChat } from "@/components/projects/project-chat";
import { shortName } from "@/lib/names";

type Msg = {
  id: string;
  content: string;
  createdAt: Date | string;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  attachments?: unknown;
};

/**
 * Full-screen, Telegram-style conversation. Fixed below the app header (60/68px)
 * so it fills the viewport and covers the mobile bottom nav — the page never
 * grows top-to-bottom. Reached as a dedicated route (native Back works).
 */
export function ConversationScreen({
  title,
  subtitle,
  backHref,
  curators = [],
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
  subtitle?: string | null;
  backHref: string;
  curators?: { id: string; fullName: string; avatarUrl: string | null }[];
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
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--background)]">
      <header className="glass-bar flex shrink-0 items-center gap-3 px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-4">
        <BackButton fallbackHref={backHref} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-bold leading-tight sm:text-base">{title}</h1>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            {curators.length > 0 ? (
              <>
                <div className="flex -space-x-1.5">
                  {curators.slice(0, 3).map((c) => (
                    <UserAvatar key={c.id} name={c.fullName} avatarUrl={c.avatarUrl} size="xs" clickable={false} className="!size-5 ring-2 ring-[var(--card)]" />
                  ))}
                </div>
                <span className="truncate text-xs text-[var(--muted)]">
                  {curators.map((c) => shortName(c.fullName)).join(", ")}
                </span>
              </>
            ) : subtitle ? (
              <span className="truncate text-xs text-[var(--muted)]">{subtitle}</span>
            ) : null}
          </div>
        </div>
        {openHref && (
          <Link
            href={openHref}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--foreground)]"
          >
            {openLabel ?? t("contractor.openStage")}
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </header>
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
