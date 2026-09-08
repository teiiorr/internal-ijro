import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { IconUser as UserIcon } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { getContractorChatProjects } from "@/server/queries/projects";
import { SmoothImage } from "@/components/ui/smooth-image";
import { formatChatTime } from "@/lib/dates";
import { shortName } from "@/lib/names";

export default async function ContractorChatsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const { chats } = await getContractorChatProjects(session.user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("contractor.chats.title")}</h1>

      {chats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] py-16 text-center text-sm text-[var(--muted)]">
          {t("contractor.chats.empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {chats.map((c, i) => (
            <Link
              key={c.id}
              href={`/contractor/chats/${c.id}`}
              className={`flex items-center gap-3 px-3 py-2.5 transition-colors active:bg-[var(--glass-fill)] hover:bg-[var(--glass-fill)] ${i > 0 ? "border-t border-[var(--border)]" : ""}`}
            >
              <div className="relative shrink-0 overflow-hidden rounded-full bg-[var(--surface-2)]" style={{ width: 52, height: 52 }}>
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
                  <p className="truncate text-[15px] font-bold">{c.name}</p>
                  {c.lastMessage && (
                    <span className={`shrink-0 text-[11px] tabular-nums ${c.unread > 0 ? "font-semibold text-[var(--primary)]" : "text-[var(--subtle)]"}`}>{formatChatTime(c.lastMessage.createdAt, locale)}</span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className={`min-w-0 flex-1 truncate text-sm ${c.unread > 0 ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                    {c.lastMessage
                      ? `${c.lastMessage.userName ? shortName(c.lastMessage.userName) + ": " : ""}${c.lastMessage.content}`
                      : c.curator
                        ? `${t("contractor.chats.curator")}: ${shortName(c.curator.fullName)}`
                        : t("contractor.chats.noMessages")}
                  </p>
                  {c.unread > 0 && (
                    <span className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-[var(--primary)] px-1.5 text-[11px] font-bold text-white tabular-nums">
                      {c.unread > 99 ? "99+" : c.unread}
                    </span>
                  )}
                </div>
                {!c.curator && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[var(--warning)]"><UserIcon className="size-3.5" />{t("contractor.chats.noCurator")}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
