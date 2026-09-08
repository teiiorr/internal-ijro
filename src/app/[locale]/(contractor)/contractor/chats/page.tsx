import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getContractorChatProjects } from "@/server/queries/projects";
import { ChatsList } from "./chats-list";

export default async function ContractorChatsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const { chats } = await getContractorChatProjects(session.user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("contractor.chats.title")}</h1>
      {chats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] py-16 text-center text-sm text-[var(--muted)]">
          {t("contractor.chats.empty")}
        </div>
      ) : (
        <ChatsList chats={chats.map((c) => ({ ...c, lastMessage: c.lastMessage ? { ...c.lastMessage, createdAt: c.lastMessage.createdAt as Date } : null }))} />
      )}
    </div>
  );
}
