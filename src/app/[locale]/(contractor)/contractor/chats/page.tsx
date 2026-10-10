import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getContractorChatProjects } from "@/server/queries/projects";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Card } from "@/components/ui-biib/Card";
import { ChatsList } from "./chats-list";

export default async function ContractorChatsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const { chats } = await getContractorChatProjects(session.user.id);

  return (
    <div>
      <PageHeader title={t("contractor.chats.title")} />
      {chats.length === 0 ? (
        <Card>
          <p className="py-10 text-center t-small text-[var(--ink-3)]">{t("contractor.chats.empty")}</p>
        </Card>
      ) : (
        <ChatsList chats={chats.map((c) => ({ ...c, lastMessage: c.lastMessage ? { ...c.lastMessage, createdAt: c.lastMessage.createdAt as Date } : null }))} />
      )}
    </div>
  );
}
