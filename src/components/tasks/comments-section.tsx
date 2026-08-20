"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { addComment } from "@/server/actions/tasks";
import { formatDateTime } from "@/lib/dates";
import { UserAvatar } from "@/components/ui/user-avatar";

type C = {
  id: string;
  content: string;
  createdAt: Date | string;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  parentCommentId: string | null;
};
type User = { id: string; fullName: string };

export function CommentsSection({ taskId, comments }: { taskId: string; comments: C[]; users?: User[] }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");

  function send() {
    if (!text.trim()) return;
    start(async () => {
      await addComment({ taskId, content: text });
      setText("");
    });
  }


  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <UserAvatar name={c.userName} avatarUrl={c.userAvatarUrl} size="sm" />
            <div className="flex-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] p-3.5">
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-semibold text-sm">{c.userName}</span>
                <span className="text-[12px] text-[var(--muted)] tabular">{formatDateTime(c.createdAt)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{c.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-[var(--muted)] py-2">{t("tasks.sections.noComments")}</p>}
      </div>
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("tasks.sections.writeComment")}
          rows={3}
        />
        <div className="flex justify-end">
          <Button onClick={send} disabled={pending || !text.trim()}>{t("tasks.sections.send")}</Button>
        </div>
      </div>
    </div>
  );
}
