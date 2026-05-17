"use client";
import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BadgeCheck, FileText } from "lucide-react";
import { submitTaskResponse } from "@/server/actions/tasks";

type Props = {
  taskId: string;
  myStatus: string;
  responseText: string | null;
  responseFileUrl: string | null;
  responseFileName: string | null;
  responseSubmittedAt: Date | string | null;
};

export function MyResponseCard({ taskId, myStatus, responseText, responseFileUrl, responseFileName, responseSubmittedAt }: Props) {
  const t = useTranslations();
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim()) return;
    const file = fileRef.current?.files?.[0] ?? null;
    start(async () => {
      try {
        await submitTaskResponse({ taskId, responseText: text }, file);
        toast.success("Javob yuborildi", { description: "Topshiriq beruvchi tekshirib chiqadi." });
        setText("");
        setEditing(false);
        if (fileRef.current) fileRef.current.value = "";
      } catch (err) {
        toast.error("Yuborib bo'lmadi", { description: (err as Error).message });
      }
    });
  }

  const fmt = (d: Date | string | null) =>
    d ? new Intl.DateTimeFormat("uz-UZ", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d)) : "—";

  return (
    <Card className="overflow-hidden">
      <div className="px-7 pt-6 pb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold tracking-tight">Javobingiz</h3>
        {myStatus === "completed" && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--success)]">
            <BadgeCheck className="size-4" /> Qabul qilindi
          </span>
        )}
        {myStatus === "under_review" && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--warning)]">
            Tekshiruvda
          </span>
        )}
        {myStatus === "rejected" && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--danger)]">
            Rad etildi
          </span>
        )}
      </div>

      <div className="px-7 pb-6 space-y-3">
        {responseSubmittedAt && !editing ? (
          <div className="space-y-2">
            <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{responseText}</p>
            {responseFileUrl && (
              <a href={responseFileUrl} className="inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:underline">
                <FileText className="size-4" /> {responseFileName ?? "Fayl"}
              </a>
            )}
            <p className="text-[12px] text-[var(--muted)] tabular">{fmt(responseSubmittedAt)}</p>
            {myStatus === "rejected" && (
              <Button variant="outline" onClick={() => setEditing(true)}>Qayta yuborish</Button>
            )}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <Textarea
              placeholder="Bajarilgan ish haqida qisqacha yozing..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
            />
            <Input type="file" ref={fileRef} />
            <Button type="submit" disabled={pending || !text.trim()} size="lg">
              {t("common.send")}
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}
