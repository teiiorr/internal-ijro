"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { IconSend as Send, IconTrash as Trash2, IconLoader2 as Loader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addContestComment, removeContestComment } from "@/server/actions/contests";
import { formatDateTime } from "@/lib/dates";
import type { ContestComment } from "@/server/queries/contests";
import { UserAvatar } from "@/components/ui/user-avatar";

export function ContestComments({ contestId, comments, canModerate }: { contestId: string; comments: ContestComment[]; canModerate: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    start(async () => {
      await addContestComment({ contestId, body: text });
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-2.5">
        <h3 className="font-[family-name:var(--font-ui)] text-[1.0625rem] font-bold tracking-tight text-[var(--ink)] sm:text-[1.1875rem]">{t("tanlov.comments")}</h3>
        <span className="t-micro tabular-nums text-[var(--ink-3)]">{comments.length}</span>
      </div>

      <form onSubmit={submit} className="space-y-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={2000} placeholder={t("tanlov.commentPlaceholder")} />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending || !body.trim()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {t("tanlov.addComment")}
          </Button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="t-small text-[var(--ink-3)]">{t("tanlov.noComments")}</p>
      ) : (
        <ul className="-my-1 divide-y divide-[var(--line)]">
          {comments.map((c) => (
            <li key={c.id} className="py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-[var(--ink)]">
                  {c.userName && <UserAvatar name={c.userName} avatarUrl={c.userAvatarUrl} size="xs" clickable={false} />}
                  {c.userName ?? "—"}
                </span>
                <span className="shrink-0 t-small tabular-nums text-[var(--ink-3)]">{formatDateTime(c.createdAt as Date, locale)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words t-body text-[var(--ink)]">{c.body}</p>
              {canModerate && (
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => start(async () => { await removeContestComment(c.id); router.refresh(); })}
                    className="inline-flex items-center gap-1 t-small font-medium text-[var(--ink-3)] transition-colors hover:text-[var(--danger)]"
                  >
                    <Trash2 className="size-3.5" aria-hidden /> {t("common.delete")}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
