import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies } from "@/lib/db/schema";
import { getProject, getProjectChannels } from "@/server/queries/projects";
import { ConversationScreen } from "@/components/projects/conversation-screen";
import { eq } from "drizzle-orm";

export default async function ContractorChatPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const { id } = await params;

  const [myCompany] = await db
    .select({ id: externalCompanies.id })
    .from(externalCompanies)
    .where(eq(externalCompanies.contactEmail, session.user.email))
    .limit(1);
  if (!myCompany) notFound();

  const data = await getProject(id);
  if (!data || data.project.externalCompanyId !== myCompany.id) notFound();

  const ch = await getProjectChannels(id);
  const channels = [
    { stageId: null, label: t("conversation.general"), messages: ch.general },
    ...ch.stages.map((s) => ({ stageId: s.id, label: `${s.orderIndex + 1}. ${s.name}`, messages: ch.byStage[s.id] ?? [] })),
  ];
  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 104857600);

  // Guruh a'zolari: biz tomondagi kurator(lar) + studiya.
  const members = [
    ...data.curators.map((c) => ({ id: c.id, name: c.fullName, role: t("conversation.curator"), avatarUrl: c.avatarUrl })),
    ...(data.company ? [{ id: "studio", name: data.company.name, role: t("conversation.studio"), avatarUrl: data.company.logoUrl ?? null }] : []),
  ];

  return (
    <ConversationScreen
      title={data.project.name}
      avatarUrl={data.project.posterUrl}
      backHref="/contractor/chats"
      members={members}
      openHref={`/contractor/projects/${id}`}
      openLabel={t("contractor.chats.openProject")}
      projectId={id}
      channels={channels}
      currentUserId={session.user.id}
      currentUserName={session.user.fullName}
      maxBytes={maxBytes}
    />
  );
}
