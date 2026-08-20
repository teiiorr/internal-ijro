"use client";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { IconLoader2 as Loader, IconMessageCircle as Msg } from "@tabler/icons-react";
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

export function StudioChatTab({
  projects,
  stages,
  countsByStage,
  currentUserId,
}: {
  projects: { id: string; name: string }[];
  stages: StageInfo[];
  countsByStage: Record<string, number>;
  currentUserId: string;
}) {
  const t = useTranslations("contractors.detail");
  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id ?? "");
  const [messagesByStage, setMessagesByStage] = useState<Record<string, MsgItem[]>>({});
  const [generalMessages, setGeneralMessages] = useState<MsgItem[]>([]);
  const [loading, start] = useTransition();

  const projectStages = stages.filter((s) => s.projectId === selectedProject);

  useEffect(() => {
    if (!selectedProject) return;
    start(async () => {
      const result = await loadStageMessagesForProject(selectedProject);
      setMessagesByStage(result.byStage);
      setGeneralMessages(result.general);
    });
  }, [selectedProject]);

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)]">
        <Msg className="size-10 mb-2 opacity-40" />
        <p className="text-sm font-medium">{t("noProjects")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Project selector */}
      {projects.length > 1 && (
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full rounded-xl border border-[var(--input)] bg-[var(--surface-1)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none transition-colors"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="size-6 animate-spin text-[var(--muted)]" />
        </div>
      ) : (
        <StageChatAccordion
          projectId={selectedProject}
          stages={projectStages}
          messagesByStage={messagesByStage}
          countsByStage={countsByStage}
          generalMessages={generalMessages}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
