"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { postProjectMessage } from "@/server/actions/projects";

type Msg = { id: string; content: string; createdAt: Date | string; userName: string };

export function ProjectChat({ projectId, messages }: { projectId: string; messages: Msg[] }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");

  function send() {
    if (!text.trim()) return;
    start(async () => {
      await postProjectMessage({ projectId, content: text });
      setText("");
    });
  }

  return (
    <div className="space-y-3">
      <div className="max-h-96 overflow-y-auto space-y-2 rounded-lg border p-3">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
              <span className="font-medium text-[var(--foreground)]">{m.userName}</span>
              <span>{new Date(m.createdAt).toLocaleString()}</span>
            </div>
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-[var(--muted)]">{t("projects.chat.noMessages")}</p>}
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("projects.chat.placeholder")} rows={2} />
      <Button onClick={send} disabled={pending || !text.trim()}>{t("common.send")}</Button>
    </div>
  );
}
