"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconMessage as MessageSquare, IconSend as Send, IconTrash as Trash2, IconLoader2 as Loader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addContestComment, removeContestComment } from "@/server/actions/contests";
import { formatDateTime } from "@/lib/dates";
import type { ContestComment } from "@/server/queries/contests";

export function ContestComments({ contestId, comments, canModerate }: { contestId: string; comments: ContestComment[]; canModerate: boolean }) {
  const t = useTranslations();
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
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <MessageSquare className="size-4 text-[var(--muted)]" />
        {t("tanlov.comments")}
        <span className="rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-[var(--muted)]">{comments.length}</span>
      </h3>

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
        <p className="text-sm text-[var(--muted)]">{t("tanlov.noComments")}</p>
      ) : (
        <ul className="space-y-2.5">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{c.userName ?? "—"}</span>
                <span className="shrink-0 text-xs text-[var(--muted)] tabular-nums">{formatDateTime(c.createdAt as Date)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--foreground)]">{c.body}</p>
              {canModerate && (
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => start(async () => { await removeContestComment(c.id); router.refresh(); })}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--danger)]"
                  >
                    <Trash2 className="size-3.5" /> {t("common.delete")}
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
