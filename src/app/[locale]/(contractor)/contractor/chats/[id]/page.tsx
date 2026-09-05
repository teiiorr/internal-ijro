import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { IconArrowRight as ArrowRight, IconInfoCircle } from "@tabler/icons-react";
import { BackButton } from "@/components/ui/back-button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies } from "@/lib/db/schema";
import { getProject, getStageMessages } from "@/server/queries/projects";
import { ProjectChat } from "@/components/projects/project-chat";
import { UserAvatar } from "@/components/ui/user-avatar";
import { shortName } from "@/lib/names";
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

  const messages = await getStageMessages(id, null);
  const curators = data.curators;
  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 104857600);

  return (
    <div className="flex h-[calc(100dvh-var(--contractor-header,4rem))] flex-col gap-3">
      <div className="flex items-center gap-3">
        <BackButton fallbackHref="/contractor/chats" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">{data.project.name}</h1>
            <Link
              href={`/contractor/projects/${id}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--fg)]"
            >
              {t("contractor.chats.openProject")}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {/* Curators from our side — the mandatory participants of this chat. */}
          {curators.length > 0 ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-[var(--muted)]">{t("contractor.chats.curator")}:</span>
              {curators.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] py-0.5 pl-0.5 pr-2 text-xs">
                  <UserAvatar name={c.fullName} avatarUrl={c.avatarUrl} size="xs" clickable={false} className="!size-5" />
                  <span className="font-medium">{shortName(c.fullName)}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--warning)]">
              <IconInfoCircle className="size-3.5" />
              {t("contractor.chats.noCurator")}
            </p>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ProjectChat
          projectId={id}
          stageId={null}
          messages={messages.map((m) => ({ ...m, createdAt: m.createdAt as Date }))}
          currentUserId={session.user.id}
          currentUserName={session.user.fullName}
          maxBytes={maxBytes}
        />
      </div>
    </div>
  );
}
