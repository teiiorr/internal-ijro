"use client";
import { useTranslations, useLocale } from "next-intl";
import { useEffect, useRef, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { postProjectMessage, editProjectMessage, deleteProjectMessage } from "@/server/actions/projects";
import {
  IconSend2 as Send,
  IconPaperclip as Paperclip,
  IconFileText as FileText,
  IconDownload as Download,
  IconX as X,
  IconLoader2 as Loader,
  IconArrowBackUp as Reply,
  IconPencil as Pencil,
  IconTrash as Trash,
  IconCopy as Copy,
} from "@tabler/icons-react";
import { compressImage } from "@/lib/images/compress";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/user-avatar";

type Attachment = { url: string; name: string; size: number; mimeType: string };
type Msg = {
  id: string;
  content: string;
  createdAt: Date | string;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  attachments?: unknown;
  editedAt?: Date | string | null;
  replyToId?: string | null;
  replyToContent?: string | null;
  replyToUserName?: string | null;
};

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isImage = (m: string) => m.startsWith("image/");
const localeCode = (l: string) => (l === "ru" ? "ru-RU" : l === "uz-cyrl" ? "uz-Cyrl" : "uz-Latn");

function dateSeparator(d: Date | string, locale: string, today: string, yesterday: string): string {
  const date = d instanceof Date ? d : new Date(d);
  const now = new Date();
  const yst = new Date();
  yst.setDate(yst.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return today;
  if (date.toDateString() === yst.toDateString()) return yesterday;
  return date.toLocaleDateString(localeCode(locale), { day: "numeric", month: "long", year: "numeric" });
}

function timeOnly(d: Date | string, locale: string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleTimeString(localeCode(locale), { hour: "2-digit", minute: "2-digit" });
}

function shouldShowSeparator(current: Date | string, prev: Date | string | null): boolean {
  if (!prev) return true;
  const a = (current instanceof Date ? current : new Date(current)).toDateString();
  const b = (prev instanceof Date ? prev : new Date(prev)).toDateString();
  return a !== b;
}

type Staged = { file: File; preview?: string };

// Bitta xabar qatori: pufakçani çizadi hamda surib javob berish +
// uzoq bosish / öng tugma bosish → amallar menyusini boşqaradi.
function MessageRow({
  m,
  mine,
  sameUser,
  isOptimistic,
  locale,
  readOnly,
  onReply,
  onMenu,
}: {
  m: Msg;
  mine: boolean;
  sameUser: boolean;
  isOptimistic: boolean;
  locale: string;
  readOnly: boolean;
  onReply: (m: Msg) => void;
  onMenu: (m: Msg) => void;
}) {
  const [dx, setDx] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);
  const lp = useRef<ReturnType<typeof setTimeout> | null>(null);
  const atts = (m.attachments ?? []) as Attachment[];

  const clearLp = () => { if (lp.current) { clearTimeout(lp.current); lp.current = null; } };

  function onTouchStart(e: React.TouchEvent) {
    if (isOptimistic) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = false;
    clearLp();
    lp.current = setTimeout(() => { if (!swiping.current) onMenu(m); }, 480);
  }
  function onTouchMove(e: React.TouchEvent) {
    if (readOnly) return; // faqat öqiş rejimida javob berish uçun surish yöq
    const ddx = e.touches[0].clientX - startX.current;
    const ddy = e.touches[0].clientY - startY.current;
    if (!swiping.current && Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(ddy)) { swiping.current = true; clearLp(); }
    if (swiping.current) setDx(Math.max(-88, Math.min(0, ddx))); // javob berish uçun çapga suring
  }
  function onTouchEnd() {
    clearLp();
    if (!readOnly && dx <= -56 && !isOptimistic) onReply(m);
    setDx(0);
  }

  return (
    <div id={`m-${m.id}`} className={`relative ${sameUser ? "mt-0.5" : "mt-3"}`}>
      {/* surish paytida namoyon böladigan javob belgisi */}
      {dx < -8 && (
        <span className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]" style={{ opacity: Math.min(1, -dx / 56) }}>
          <Reply className="size-4" />
        </span>
      )}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onContextMenu={(e) => { if (!isOptimistic) { e.preventDefault(); onMenu(m); } }}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? "none" : "transform 0.18s ease-out" }}
        className={`flex items-end gap-1.5 sm:gap-2 ${mine ? "flex-row-reverse" : ""}`}
      >
        {!mine && (
          <div className="w-8 shrink-0 self-end sm:w-9">
            {!sameUser && <UserAvatar name={m.userName} avatarUrl={m.userAvatarUrl} size="xs" clickable={false} />}
          </div>
        )}

        <div className="min-w-[72px] max-w-[80%] sm:max-w-[70%]">
          {!sameUser && !mine && <p className="mb-0.5 px-1 text-[11px] font-semibold text-[var(--primary)]">{m.userName}</p>}
          <div
            className={
              "rounded-2xl px-3 py-1.5 text-[13px] leading-relaxed break-words sm:py-2 sm:text-sm " +
              (mine
                ? "bg-[var(--primary)] text-white " + (sameUser ? "rounded-tr-md" : "rounded-br-md")
                : "bg-[var(--card)] text-[var(--foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] " + (sameUser ? "rounded-tl-md" : "rounded-bl-md")) +
              (isOptimistic ? " opacity-70" : "")
            }
          >
            {/* iqtibos keltirilgan javob */}
            {m.replyToId && (m.replyToContent != null) && (
              <button
                type="button"
                onClick={() => document.getElementById(`m-${m.replyToId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className={"mb-1 block w-full rounded-lg border-l-2 py-0.5 pl-2 pr-1 text-left " + (mine ? "border-white/60 bg-white/10" : "border-[var(--primary)] bg-[var(--surface-2)]")}
              >
                <p className={"truncate text-[11px] font-semibold " + (mine ? "text-white/90" : "text-[var(--primary)]")}>{m.replyToUserName ?? ""}</p>
                <p className={"truncate text-[11px] " + (mine ? "text-white/75" : "text-[var(--muted)]")}>{m.replyToContent || "…"}</p>
              </button>
            )}

            {atts.length > 0 && (
              <div className="mb-1 space-y-1.5">
                {atts.map((a, j) =>
                  isImage(a.mimeType) ? (
                    <a key={j} href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={a.url} alt={a.name} className="max-h-40 rounded-xl object-cover sm:max-h-52" loading="lazy" />
                    </a>
                  ) : (
                    <a key={j} href={a.url} download className={"flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors " + (mine ? "bg-white/15 hover:bg-white/25" : "bg-[var(--surface-2)] hover:bg-[var(--surface-3)]")}>
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
            {m.content.trim() && <p className="whitespace-pre-wrap text-center">{m.content}</p>}
            <p className={`mt-0.5 text-center text-[10px] leading-none ${mine ? "text-white/55" : "text-[var(--muted)]"}`}>
              {m.editedAt ? "✎ " : ""}{isOptimistic ? "..." : timeOnly(m.createdAt, locale)}
            </p>
          </div>
        </div>

        {mine && <div className="w-8 shrink-0 sm:w-9" />}
      </div>
    </div>
  );
}

export function ProjectChat({
  projectId,
  stageId,
  messages,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  maxBytes = 104857600,
  fill = false,
  readOnly = false,
  canModerate = false,
}: {
  projectId: string;
  stageId?: string | null;
  messages: Msg[];
  currentUserId: string;
  currentUserName?: string;
  currentUserAvatar?: string | null;
  maxBytes?: number;
  fill?: boolean;
  /** Faqat öqiş: kiritiş maydoni, javob/tahrir/öçiriş berkitiladi (nusxa olish qoladi). */
  readOnly?: boolean;
  /** Egasi/muharrir — istalgan xabarni öçira oladi (nafaqat özinikini). */
  canModerate?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [, start] = useTransition();
  const [text, setText] = useState("");
  const [staged, setStaged] = useState<Staged | null>(null);
  const [uploading, setUploading] = useState(false);
  const [optimistic, setOptimistic] = useState<Msg[]>([]);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editing, setEditing] = useState<Msg | null>(null);
  const [menuFor, setMenuFor] = useState<Msg | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const allMessages = [...messages, ...optimistic.filter(o => !messages.some(m => m.content === o.content && m.userId === o.userId && Math.abs(new Date(m.createdAt).getTime() - new Date(o.createdAt).getTime()) < 5000))];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "instant" }); }, [allMessages.length]);
  useEffect(() => { if (messages.length > 0 && optimistic.length > 0) setOptimistic([]); }, [messages.length, optimistic.length]);
  useEffect(() => () => { if (staged?.preview) URL.revokeObjectURL(staged.preview); }, [staged]);

  async function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    let finalFile = file;
    if (file.type.startsWith("image/")) {
      try { const r = await compressImage(file); finalFile = r.file; } catch { /* aslini qoldiramiz */ }
    }
    if (finalFile.size > maxBytes) { toast.error(t("projects.chat.fileTooLarge")); return; }
    const preview = finalFile.type.startsWith("image/") ? URL.createObjectURL(finalFile) : undefined;
    setStaged({ file: finalFile, preview });
  }
  function clearFile() { if (staged?.preview) URL.revokeObjectURL(staged.preview); setStaged(null); }

  async function uploadFile(file: File): Promise<Attachment | null> {
    const qs = new URLSearchParams({ projectId, name: file.name });
    const res = await fetch(`/api/files/chat-attachments?${qs}`, { method: "POST", headers: { "content-type": file.type || "application/octet-stream" }, body: file });
    if (!res.ok) return null;
    return res.json();
  }

  function startEdit(m: Msg) { setEditing(m); setReplyTo(null); setText(m.content); setMenuFor(null); setTimeout(() => inputRef.current?.focus(), 0); }
  function startReply(m: Msg) { setReplyTo(m); setEditing(null); setMenuFor(null); setTimeout(() => inputRef.current?.focus(), 0); }
  function cancelCompose() { setReplyTo(null); setEditing(null); setText(""); }

  const send = useCallback(async () => {
    // Tahrirlash rejimi
    if (editing) {
      const val = text.trim();
      if (!val) return;
      const id = editing.id;
      setEditing(null); setText("");
      try { await editProjectMessage(id, val); router.refresh(); }
      catch { toast.error(t("projects.chat.sendError")); }
      return;
    }

    const hasText = text.trim().length > 0;
    const hasFile = !!staged;
    if (!hasText && !hasFile) return;
    const msgText = text.trim() || " ";
    const currentReply = replyTo;

    const optimisticMsg: Msg = {
      id: `optimistic-${Date.now()}`,
      content: msgText,
      createdAt: new Date(),
      userId: currentUserId,
      userName: currentUserName ?? "",
      userAvatarUrl: currentUserAvatar,
      attachments: [],
      replyToId: currentReply?.id ?? null,
      replyToContent: currentReply?.content ?? null,
      replyToUserName: currentReply?.userName ?? null,
    };
    setOptimistic(prev => [...prev, optimisticMsg]);
    setText("");
    setReplyTo(null);
    inputRef.current?.focus();

    let attachments: Attachment[] | undefined;
    if (staged) {
      setUploading(true);
      const att = await uploadFile(staged.file);
      setUploading(false);
      if (!att) { toast.error(t("projects.chat.uploadError")); setOptimistic(prev => prev.filter(m => m.id !== optimisticMsg.id)); return; }
      attachments = [att];
      clearFile();
    }

    start(async () => {
      try {
        await postProjectMessage({ projectId, ...(stageId ? { stageId } : {}), content: msgText, attachments, replyToId: currentReply?.id ?? null });
      } catch {
        setOptimistic(prev => prev.filter(m => m.id !== optimisticMsg.id));
        toast.error(t("projects.chat.sendError"));
      }
    });
  }, [editing, text, staged, replyTo, currentUserId, currentUserName, currentUserAvatar, projectId, stageId, t, router]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!uploading) send(); }
    if (e.key === "Escape") cancelCompose();
  }

  async function doDelete(m: Msg) {
    setMenuFor(null);
    if (!window.confirm(t("projects.chat.deletePrompt"))) return;
    try { await deleteProjectMessage(m.id); router.refresh(); }
    catch { toast.error(t("projects.chat.sendError")); }
  }
  async function doCopy(m: Msg) {
    setMenuFor(null);
    try { await navigator.clipboard.writeText(m.content); toast.success(t("projects.chat.copied")); } catch { /* e'tiborsiz qoldiramiz */ }
  }

  const composing = replyTo || editing;

  return (
    <div
      className={fill ? "flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface-1)]" : "flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden"}
      style={fill ? undefined : { height: "min(560px, 50dvh)", maxHeight: "560px" }}
    >
      <div className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-3 sm:px-4">
        {allMessages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[var(--muted)]">{t("projects.chat.noMessages")}</p>
          </div>
        )}
        {allMessages.map((m, i) => {
          const prev = i > 0 ? allMessages[i - 1] : null;
          const showDate = shouldShowSeparator(m.createdAt, prev?.createdAt ?? null);
          const sameUser = prev?.userId === m.userId && !showDate;
          return (
            <div key={m.id}>
              {showDate && (
                <div className="flex justify-center py-2.5">
                  <span className="glass-soft rounded-full px-3 py-1 text-[11px] font-semibold text-[var(--muted)]">
                    {dateSeparator(m.createdAt, locale, locale === "ru" ? "Сегодня" : locale === "uz-cyrl" ? "Бугун" : "Bugun", locale === "ru" ? "Вчера" : locale === "uz-cyrl" ? "Кеча" : locale === "oz" ? "Keça" : "Kecha")}
                  </span>
                </div>
              )}
              <MessageRow
                m={m}
                mine={m.userId === currentUserId}
                sameUser={sameUser}
                isOptimistic={m.id.startsWith("optimistic-")}
                locale={locale}
                readOnly={readOnly}
                onReply={startReply}
                onMenu={setMenuFor}
              />
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Yuklaşga tayyorlangan faylni oldindan köriş */}
      {staged && (
        <div className="mx-2 mb-1 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 sm:mx-4">
          {staged.preview ? (
            <img src={staged.preview} alt="" className="size-10 rounded-lg object-cover" />
          ) : (
            <div className="grid size-10 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]"><FileText className="size-5" /></div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{staged.file.name}</p>
            <p className="text-xs text-[var(--muted)]">{humanSize(staged.file.size)}</p>
          </div>
          <button onClick={clearFile} className="grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-[var(--surface-3)] active:scale-95"><X className="size-4 text-[var(--muted)]" /></button>
        </div>
      )}

      {/* Javob / tahrirlash konteksti paneli */}
      {composing && (
        <div className="mx-2 mb-1 flex items-center gap-2 rounded-xl border-l-2 border-[var(--primary)] bg-[var(--card)] px-3 py-2 sm:mx-4">
          {editing ? <Pencil className="size-4 shrink-0 text-[var(--primary)]" /> : <Reply className="size-4 shrink-0 text-[var(--primary)]" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-[var(--primary)]">{editing ? t("projects.chat.editing") : (replyTo?.userName ?? t("projects.chat.reply"))}</p>
            <p className="truncate text-xs text-[var(--muted)]">{(editing ?? replyTo)?.content || "…"}</p>
          </div>
          <button onClick={cancelCompose} className="grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-[var(--surface-3)] active:scale-95"><X className="size-4 text-[var(--muted)]" /></button>
        </div>
      )}

      {/* Kiritiş maydoni — faqat öqiş rejimida körsatilmaydi */}
      {readOnly ? (
        <div className={`border-t border-[var(--border)] px-3 py-2.5 text-center text-xs font-medium text-[var(--muted)] ${fill ? "glass-strong pb-[max(0.5rem,env(safe-area-inset-bottom))]" : "bg-[var(--card)]"}`}>
          {t("conversation.readOnly")}
        </div>
      ) : (
        <div className={`border-t border-[var(--border)] px-2 py-2 sm:px-3 sm:py-2.5 ${fill ? "glass-strong pb-[max(0.5rem,env(safe-area-inset-bottom))]" : "bg-[var(--card)]"}`}>
          <div className="flex items-end gap-1 sm:gap-2">
            <input ref={fileRef} type="file" className="hidden" onChange={onFileSelect} />
            {!editing && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="grid size-11 shrink-0 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--foreground)] active:scale-95 disabled:opacity-50 sm:size-10">
                <Paperclip className="size-[18px] sm:size-5" />
              </button>
            )}
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("projects.chat.placeholder")}
              rows={1}
              className="max-h-28 min-h-[36px] flex-1 resize-none rounded-2xl border border-[var(--input)] bg-[var(--surface-1)] px-3 py-2 text-[13px] leading-snug text-[var(--foreground)] placeholder:text-[var(--subtle)] transition-colors focus:border-[var(--primary)] focus:outline-none sm:min-h-[40px] sm:px-4 sm:text-sm"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button type="button" onClick={send} disabled={uploading || (!text.trim() && !staged)} className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 sm:size-10">
              {uploading ? <Loader className="size-[18px] animate-spin sm:size-5" /> : <Send className="size-[18px] sm:size-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Xabar amallari menyusi (pastki panel) */}
      {menuFor && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setMenuFor(null)} aria-hidden />
          <div className="fixed inset-x-0 bottom-0 z-[60] rounded-t-3xl glass-strong p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-md space-y-1">
              {!readOnly && (
                <MenuItem icon={<Reply className="size-5" />} label={t("projects.chat.reply")} onClick={() => startReply(menuFor)} />
              )}
              <MenuItem icon={<Copy className="size-5" />} label={t("projects.chat.copy")} onClick={() => doCopy(menuFor)} />
              {!readOnly && menuFor.userId === currentUserId && (
                <MenuItem icon={<Pencil className="size-5" />} label={t("projects.chat.edit")} onClick={() => startEdit(menuFor)} />
              )}
              {!readOnly && (menuFor.userId === currentUserId || canModerate) && (
                <MenuItem icon={<Trash className="size-5" />} label={t("projects.chat.delete")} danger onClick={() => doDelete(menuFor)} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition-colors active:scale-[0.99] ${danger ? "text-[var(--danger)] hover:bg-[var(--danger-soft)]" : "text-[var(--foreground)] hover:bg-[var(--glass-fill)]"}`}
    >
      {icon}
      {label}
    </button>
  );
}
