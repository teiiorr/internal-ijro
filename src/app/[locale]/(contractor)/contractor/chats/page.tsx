import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { IconChevronRight as ChevronRight, IconUser as UserIcon } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { getContractorChatProjects } from "@/server/queries/projects";
import { SmoothImage } from "@/components/ui/smooth-image";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatDateTime } from "@/lib/dates";
import { shortName } from "@/lib/names";

export default async function ContractorChatsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { chats } = await getContractorChatProjects(session.user.id);

  return (
    <div className="space-y-5 stagger-children">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("contractor.chats.title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("contractor.chats.subtitle")}</p>
      </div>

      {chats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] py-16 text-center text-sm text-[var(--muted)]">
          {t("contractor.chats.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((c) => (
            <Link
              key={c.id}
              href={`/contractor/chats/${c.id}`}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-1)] transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow-2)] active:scale-[0.995]"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl bg-[var(--surface-2)] sm:size-14">
                {c.posterUrl ? (
                  <SmoothImage src={c.posterUrl} alt={c.name} className="size-full object-cover object-[center_25%]" />
                ) : (
                  <div className="grid size-full place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                    <span className="text-xl font-black text-[var(--subtle)]">{c.name.trim().charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-bold">{c.name}</p>
                  {c.lastMessage && (
                    <span className="shrink-0 text-[11px] text-[var(--subtle)] tabular-nums">{formatDateTime(c.lastMessage.createdAt, locale)}</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
                  {c.lastMessage
                    ? `${c.lastMessage.userName ? shortName(c.lastMessage.userName) + ": " : ""}${c.lastMessage.content}`
                    : t("contractor.chats.noMessages")}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--subtle)]">
                  {c.curator ? (
                    <>
                      <UserAvatar name={c.curator.fullName} avatarUrl={c.curator.avatarUrl} size="xs" clickable={false} className="!size-5" />
                      <span className="truncate"><span className="font-semibold text-[var(--muted)]">{t("contractor.chats.curator")}:</span> {shortName(c.curator.fullName)}</span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[var(--warning)]"><UserIcon className="size-3.5" />{t("contractor.chats.noCurator")}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-[var(--subtle)]" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
