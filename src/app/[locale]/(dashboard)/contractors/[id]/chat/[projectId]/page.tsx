import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getProject, getStageMessages } from "@/server/queries/projects";
import { ConversationScreen } from "@/components/projects/conversation-screen";

const EXTRA_USERS = ["90956fa9-4892-4677-a31b-10af180e341a"];

export default async function StudioConversationPage({ params }: { params: Promise<{ id: string; projectId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["direktor", "orinbosar", "koordinator", "bolim_boshligi"].includes(session.user.position) && !EXTRA_USERS.includes(session.user.id)) redirect("/dashboard");

  const t = await getTranslations();
  const { id, projectId } = await params;
  const data = await getProject(projectId);
  // Only a project that actually belongs to this studio.
  if (!data || data.project.externalCompanyId !== id) notFound();

  const messages = await getStageMessages(projectId, null);
  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 104857600);

  const members = [
    ...data.curators.map((c) => ({ id: c.id, name: c.fullName, role: t("conversation.curator"), avatarUrl: c.avatarUrl })),
    ...(data.company ? [{ id: "studio", name: data.company.name, role: t("conversation.studio"), avatarUrl: data.company.logoUrl ?? null }] : []),
  ];

  return (
    <ConversationScreen
      title={data.project.name}
      avatarUrl={data.project.posterUrl}
      backHref={`/contractors/${id}`}
      members={members}
      projectId={projectId}
      stageId={null}
      messages={messages}
      currentUserId={session.user.id}
      currentUserName={session.user.fullName}
      maxBytes={maxBytes}
    />
  );
}
