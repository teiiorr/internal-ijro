"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  IconChevronDown as ChevronDown,
  IconMessageCircle as MessageIcon,
} from "@tabler/icons-react";
import { ProjectChat } from "./project-chat";

type StageInfo = {
  id: string;
  name: string;
  orderNumber: number;
  status: string;
};

type Msg = {
  id: string;
  content: string;
  createdAt: Date | string;
  userId: string;
  userName: string;
  attachments?: unknown;
};

type MessagesByStage = Record<string, Msg[]>;
type CountsByStage = Record<string, number>;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function StageChatAccordion({
  projectId,
  stages,
  messagesByStage,
  countsByStage,
  generalMessages,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}: {
  projectId: string;
  stages: StageInfo[];
  messagesByStage: MessagesByStage;
  countsByStage: CountsByStage;
  generalMessages: Msg[];
  currentUserId: string;
  currentUserName?: string;
  currentUserAvatar?: string | null;
}) {
  const t = useTranslations("contractors.detail");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sorted = [...stages].sort((a, b) => a.orderNumber - b.orderNumber);

  return (
    <div className="space-y-2">
      {/* General (project-level) chat */}
      <AccordionItem
        id="__general__"
        label={t("generalChat")}
        badge={null}
        count={generalMessages.length}
        open={openIds.has("__general__")}
        onToggle={() => toggle("__general__")}
      >
        <ProjectChat
          projectId={projectId}
          stageId={null}
          messages={generalMessages}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
        />
      </AccordionItem>

      {sorted.map((stage) => {
        const msgs = messagesByStage[stage.id] ?? [];
        const count = countsByStage[stage.id] ?? 0;
        return (
          <AccordionItem
            key={stage.id}
            id={stage.id}
            label={`${stage.orderNumber}. ${stage.name}`}
            badge={stage.status}
            count={count}
            open={openIds.has(stage.id)}
            onToggle={() => toggle(stage.id)}
          >
            <ProjectChat
              projectId={projectId}
              stageId={stage.id}
              messages={msgs}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
            />
          </AccordionItem>
        );
      })}
    </div>
  );
}

function AccordionItem({
  id,
  label,
  badge,
  count,
  open,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  badge: string | null;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-3 sm:px-4 text-left transition-colors hover:bg-[var(--surface-2)]"
      >
        <ChevronDown
          className={`size-4 shrink-0 text-[var(--muted)] transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
        />
        <span className="flex-1 truncate text-sm font-semibold text-[var(--foreground)]">
          {label}
        </span>
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[badge] ?? STATUS_COLORS.pending}`}>
            {badge}
          </span>
        )}
        {count > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--primary)]">
            <MessageIcon className="size-3" />
            {count}
          </span>
        )}
      </button>
      {open && <div className="border-t border-[var(--border)] p-2 sm:p-3">{children}</div>}
    </div>
  );
}
