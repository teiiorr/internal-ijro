import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getProject, getStageMessages } from "@/server/queries/projects";
import { ConversationScreen } from "@/components/projects/conversation-screen";
import { canViewContractorChats, isContractorManager, canModerateContractorChats } from "@/lib/permissions/contractors";

export default async function StudioConversationPage({ params }: { params: Promise<{ id: string; projectId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await canViewContractorChats(session.user))) redirect("/dashboard");
  // Boşqaruvçilar yozadi; egasi ruxsat bergan xodimlar esa faqat öqiydi.
  const readOnly = !isContractorManager(session.user);
  const canModerate = await canModerateContractorChats(session.user);

  const t = await getTranslations();
  const { id, projectId } = await params;
  const data = await getProject(projectId);
  // Faqat haqiqatan ham şu studiyaga tegişli loyiha.
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
      readOnly={readOnly}
      canModerate={canModerate}
    />
  );
}
