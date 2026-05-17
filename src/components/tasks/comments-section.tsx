"use client";
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
  // Very simple @mention parser: matches @"FullName" or @FirstName_Last (no spaces).
  const ids: string[] = [];
  const tokens = text.match(/@([A-Za-zЀ-ӿ0-9_'\-]+)/g) ?? [];
  for (const tok of tokens) {
    const slug = tok.slice(1).toLowerCase();
    const u = users.find((u) => u.fullName.toLowerCase().replace(/\s+/g, "") === slug);
    if (u) ids.push(u.id);
  }
  return Array.from(new Set(ids));
}

export function CommentsSection({ taskId, comments, users }: { taskId: string; comments: C[]; users: User[] }) {
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
        {comments.length === 0 && <p className="text-sm text-[var(--muted)]">No comments yet.</p>}
      </div>
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment... mention with @FullName"
          rows={3}
        />
        <Button onClick={send} disabled={pending || !text.trim()}>Send</Button>
      </div>
    </div>
  );
}
