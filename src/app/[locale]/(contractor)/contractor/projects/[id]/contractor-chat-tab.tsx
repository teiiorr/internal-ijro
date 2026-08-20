"use client";
import { useEffect, useState, useTransition } from "react";
import { IconLoader2 as Loader } from "@tabler/icons-react";
import { StageChatAccordion } from "@/components/projects/stage-chat-accordion";
import { loadStageMessagesForProject } from "@/server/actions/projects";

type StageInfo = {
  id: string;
  projectId: string;
  name: string;
  orderNumber: number;
  status: string;
};

type MsgItem = {
  id: string;
  content: string;
  createdAt: Date | string;
  userId: string;
  userName: string;
  attachments?: unknown;
};

export function ContractorChatTab({
  projectId,
  stages,
  currentUserId,
}: {
  projectId: string;
  stages: StageInfo[];
  currentUserId: string;
}) {
  const [messagesByStage, setMessagesByStage] = useState<Record<string, MsgItem[]>>({});
  const [generalMessages, setGeneralMessages] = useState<MsgItem[]>([]);
  const [loading, start] = useTransition();

  useEffect(() => {
    start(async () => {
      const result = await loadStageMessagesForProject(projectId);
      setMessagesByStage(result.byStage);
      setGeneralMessages(result.general);
    });
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="size-6 animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  return (
    <StageChatAccordion
      projectId={projectId}
      stages={stages}
      messagesByStage={messagesByStage}
      countsByStage={{}}
      generalMessages={generalMessages}
      currentUserId={currentUserId}
    />
  );
}
