"use client";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { postProjectMessage } from "@/server/actions/projects";
import {
  IconSend2 as Send,
  IconPaperclip as Paperclip,
  IconFileText as FileText,
  IconDownload as Download,
  IconX as X,
  IconLoader2 as Loader,
} from "@tabler/icons-react";
import { compressImage } from "@/lib/images/compress";
import { toast } from "sonner";

type Attachment = { url: string; name: string; size: number; mimeType: string };
type Msg = {
  id: string;
  content: string;
  createdAt: Date | string;
  userId: string;
  userName: string;
  attachments?: unknown;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
];
function avatarColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = ((h << 5) - h + userId.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isImage = (m: string) => m.startsWith("image/");

function dateSeparator(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Bugun";
  if (date.toDateString() === yesterday.toDateString()) return "Kecha";
  return date.toLocaleDateString("uz-Latn", { day: "numeric", month: "long", year: "numeric" });
}

function timeOnly(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleTimeString("uz-Latn", { hour: "2-digit", minute: "2-digit" });
}

function shouldShowSeparator(current: Date | string, prev: Date | string | null): boolean {
  if (!prev) return true;
  const a = (current instanceof Date ? current : new Date(current)).toDateString();
  const b = (prev instanceof Date ? prev : new Date(prev)).toDateString();
  return a !== b;
}

type Staged = { file: File; preview?: string };

export function ProjectChat({
  projectId,
  stageId,
  messages,
  currentUserId,
  maxBytes = 104857600,
}: {
  projectId: string;
  stageId?: string | null;
  messages: Msg[];
  currentUserId: string;
  maxBytes?: number;
}) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [staged, setStaged] = useState<Staged | null>(null);
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (staged?.preview) URL.revokeObjectURL(staged.preview);
    };
  }, [staged]);

  async function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    let finalFile = file;
    if (file.type.startsWith("image/")) {
      try {
        const r = await compressImage(file);
        finalFile = r.file;
      } catch { /* keep original */ }
    }
    if (finalFile.size > maxBytes) {
      toast.error(t("projects.chat.fileTooLarge"));
      return;
    }
    const preview = finalFile.type.startsWith("image/") ? URL.createObjectURL(finalFile) : undefined;
    setStaged({ file: finalFile, preview });
  }

  function clearFile() {
    if (staged?.preview) URL.revokeObjectURL(staged.preview);
    setStaged(null);
  }

  async function uploadFile(file: File): Promise<Attachment | null> {
    const qs = new URLSearchParams({ projectId, name: file.name });
    const res = await fetch(`/api/files/chat-attachments?${qs}`, {
      method: "POST",
      headers: { "content-type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) return null;
    return res.json();
  }

  async function send() {
    const hasText = text.trim().length > 0;
    const hasFile = !!staged;
    if (!hasText && !hasFile) return;

    let attachments: Attachment[] | undefined;
    if (staged) {
      setUploading(true);
      const att = await uploadFile(staged.file);
      setUploading(false);
      if (!att) {
        toast.error(t("projects.chat.uploadError"));
        return;
      }
      attachments = [att];
      clearFile();
    }

    start(async () => {
      await postProjectMessage({
        projectId,
        ...(stageId ? { stageId } : {}),
        content: text.trim() || " ",
        attachments,
      });
      setText("");
      inputRef.current?.focus();
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!pending && !uploading) send();
    }
  }

  const busy = pending || uploading;

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden" style={{ height: "min(560px, 65dvh)" }}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-3 sm:px-4 space-y-0.5">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[var(--muted)]">{t("projects.chat.noMessages")}</p>
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.userId === currentUserId;
          const prev = i > 0 ? messages[i - 1] : null;
          const showDate = shouldShowSeparator(m.createdAt, prev?.createdAt ?? null);
          const sameUser = prev?.userId === m.userId && !showDate;
          const atts = (m.attachments ?? []) as Attachment[];

          return (
            <div key={m.id}>
              {showDate && (
                <div className="flex justify-center py-2.5">
                  <span className="rounded-full bg-[var(--surface-3)] px-3 py-1 text-[11px] font-semibold text-[var(--muted)]">
                    {dateSeparator(m.createdAt)}
                  </span>
                </div>
              )}
              <div className={`flex items-end gap-1.5 sm:gap-2 ${mine ? "flex-row-reverse" : ""} ${sameUser ? "mt-0.5" : "mt-3"}`}>
                {/* Avatar — hidden on own messages, collapsed if same user */}
                {!mine && (
                  <div className="w-7 sm:w-8 shrink-0 self-end">
                    {!sameUser && (
                      <div className={`grid size-7 sm:size-8 place-items-center rounded-full text-[10px] sm:text-[11px] font-bold text-white ${avatarColor(m.userId)}`}>
                        {initials(m.userName)}
                      </div>
                    )}
                  </div>
                )}

                {/* Bubble */}
                <div className={`max-w-[80%] sm:max-w-[70%] min-w-[72px]`}>
                  {!sameUser && !mine && (
                    <p className="mb-0.5 px-1 text-[11px] font-semibold text-[var(--primary)]">{m.userName}</p>
                  )}
                  <div
                    className={
                      "rounded-2xl px-3 py-1.5 sm:py-2 text-[13px] sm:text-sm leading-relaxed break-words " +
                      (mine
                        ? "bg-[var(--primary)] text-white " + (sameUser ? "rounded-tr-md" : "rounded-br-md")
                        : "bg-[var(--card)] text-[var(--foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] " + (sameUser ? "rounded-tl-md" : "rounded-bl-md"))
                    }
                  >
                    {/* Attachments */}
                    {atts.length > 0 && (
                      <div className="space-y-1.5 mb-1">
                        {atts.map((a, j) =>
                          isImage(a.mimeType) ? (
                            <a key={j} href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                              <img
                                src={a.url}
                                alt={a.name}
                                className="max-h-40 sm:max-h-52 rounded-xl object-cover"
                                loading="lazy"
                              />
                            </a>
                          ) : (
                            <a
                              key={j}
                              href={a.url}
                              download
                              className={
                                "flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors " +
                                (mine ? "bg-white/15 hover:bg-white/25" : "bg-[var(--surface-2)] hover:bg-[var(--surface-3)]")
                              }
                            >
                              <FileText className="size-5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold">{a.name}</p>
                                <p className={`text-[10px] ${mine ? "text-white/70" : "text-[var(--muted)]"}`}>{humanSize(a.size)}</p>
                              </div>
                              <Download className="size-4 shrink-0 opacity-60" />
                            </a>
                          )
                        )}
                      </div>
                    )}
                    {m.content.trim() && <p className="whitespace-pre-wrap">{m.content}</p>}
                    <p className={`mt-0.5 text-right text-[10px] leading-none ${mine ? "text-white/55" : "text-[var(--muted)]"}`}>
                      {timeOnly(m.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Spacer for own messages (keeps alignment without avatar) */}
                {mine && <div className="w-7 sm:w-8 shrink-0" />}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Staged file preview */}
      {staged && (
        <div className="mx-2 mb-1 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 sm:mx-4">
          {staged.preview ? (
            <img src={staged.preview} alt="" className="size-10 rounded-lg object-cover" />
          ) : (
            <div className="grid size-10 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
              <FileText className="size-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{staged.file.name}</p>
            <p className="text-xs text-[var(--muted)]">{humanSize(staged.file.size)}</p>
          </div>
          <button onClick={clearFile} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-[var(--surface-3)] transition-colors active:scale-95">
            <X className="size-4 text-[var(--muted)]" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[var(--border)] bg-[var(--card)] px-2 py-2 sm:px-3 sm:py-2.5">
        <div className="flex items-end gap-1 sm:gap-2">
          <input ref={fileRef} type="file" className="hidden" onChange={onFileSelect} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="grid size-9 sm:size-10 shrink-0 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--foreground)] active:scale-95 disabled:opacity-50"
          >
            <Paperclip className="size-[18px] sm:size-5" />
          </button>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("projects.chat.placeholder")}
            rows={1}
            className="max-h-28 min-h-[36px] sm:min-h-[40px] flex-1 resize-none rounded-2xl border border-[var(--input)] bg-[var(--surface-1)] px-3 sm:px-4 py-2 text-[13px] sm:text-sm leading-snug text-[var(--foreground)] placeholder:text-[var(--subtle)] transition-colors focus:border-[var(--primary)] focus:outline-none"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            type="button"
            onClick={send}
            disabled={busy || (!text.trim() && !staged)}
            className="grid size-9 sm:size-10 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
          >
            {busy ? <Loader className="size-[18px] sm:size-5 animate-spin" /> : <Send className="size-[18px] sm:size-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
