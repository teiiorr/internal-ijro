"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Plus, X } from "lucide-react";
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "@/server/actions/tasks";
import { cn } from "@/lib/utils";

type Item = { id: string; content: string; isCompleted: boolean };

export function ChecklistSection({ taskId, items }: { taskId: string; items: Item[] }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");

  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-2 text-sm">
            <Button variant="ghost" size="icon" disabled={pending} onClick={() => start(async () => { await toggleChecklistItem(i.id, taskId, !i.isCompleted); })}>
              <Check className={cn("size-4", i.isCompleted ? "text-[var(--success)]" : "text-[var(--muted)]")} />
            </Button>
            <span className={cn("flex-1", i.isCompleted && "line-through text-[var(--muted)]")}>{i.content}</span>
            <Button variant="ghost" size="icon" disabled={pending} onClick={() => start(async () => { await deleteChecklistItem(i.id, taskId); })}>
              <X className="size-4" />
            </Button>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-[var(--muted)]">{t("tasks.sections.noChecklist")}</li>}
      </ul>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("tasks.sections.newChecklistItem")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              start(async () => { await addChecklistItem({ taskId, content: text }); setText(""); });
            }
          }}
        />
        <Button
          onClick={() => { if (text.trim()) start(async () => { await addChecklistItem({ taskId, content: text }); setText(""); }); }}
          disabled={pending || !text.trim()}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
