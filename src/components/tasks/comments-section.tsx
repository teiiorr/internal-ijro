"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { addComment } from "@/server/actions/tasks";

type C = {
  id: string;
  content: string;
  createdAt: Date | string;
  userId: string;
  userName: string;
  parentCommentId: string | null;
  mentions: string[] | null;
};
type User = { id: string; fullName: string };

function parseMentions(text: string, users: User[]): string[] {
  const ids = new Set<string>();
  // @"Full Name" — explicit quoted form (supports spaces, Cyrillic, apostrophe)
  for (const m of text.matchAll(/@"([^"]+)"/g)) {
    const wanted = m[1].toLowerCase().trim();
    const u = users.find((u) => u.fullName.toLowerCase() === wanted);
    if (u) ids.add(u.id);
  }
  // @FirstWord — match by first word (unique only)
  for (const m of text.matchAll(/(?:^|\s)@([A-Za-zЀ-ӿ][A-Za-zЀ-ӿ0-9_'\-]+)/g)) {
    const wanted = m[1].toLowerCase();
    const candidates = users.filter((u) => u.fullName.toLowerCase().split(/\s+/)[0] === wanted);
    if (candidates.length === 1) ids.add(candidates[0].id);
  }
  return Array.from(ids);
}

export function CommentsSection({ taskId, comments, users }: { taskId: string; comments: C[]; users: User[] }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");

  function send() {
    if (!text.trim()) return;
    const mentions = parseMentions(text, users);
    start(async () => {
      await addComment({ taskId, content: text, mentions });
      setText("");
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg border p-3 text-sm">
            <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
              <span className="font-medium text-[var(--foreground)]">{c.userName}</span>
              <span>{new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <p className="whitespace-pre-wrap">{c.content}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-[var(--muted)]">{t("tasks.sections.noComments")}</p>}
      </div>
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("tasks.sections.writeComment")}
          rows={3}
        />
        <Button onClick={send} disabled={pending || !text.trim()}>{t("tasks.sections.send")}</Button>
      </div>
    </div>
  );
}
