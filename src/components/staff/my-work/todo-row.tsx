"use client";
import { Link } from "@/i18n/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconCalendar, IconCheck, IconNote, IconTrash, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { deleteTodo, toggleTodo, updateTodo } from "@/server/actions/personal-todos";
import { KindChip, shortDate } from "./kind-meta";

export type TodoRowItem = {
  id: string;
  title: string;
  /** Bogʻlangan topshiriq/loyiha nomi. */
  sub: string | null;
  href: string | null;
  date: string | null;
  done?: boolean;
  note: string | null;
};

/** Shaxsiy eslatma qatori: belgilash, sanani tahrirlash, izoh va oʻchirish. Ajratuvchi qator (quti emas). */
export function TodoRow({ item, today }: { item: TodoRowItem; today: string }) {
  const t = useTranslations("staffX.myWork");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDoneOptimistic] = useOptimistic(!!item.done);

  const [dateOpen, setDateOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState(item.date ?? "");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(item.note ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const overdue = !done && !!item.date && item.date < today;

  function run(fn: () => Promise<void>, onOk?: () => void) {
    start(async () => {
      try {
        await fn();
        onOk?.();
        router.refresh();
      } catch {
        toast.error(tc("error"));
      }
    });
  }

  function onToggle() {
    const next = !done;
    start(async () => {
      setDoneOptimistic(next);
      try {
        await toggleTodo(item.id, next);
        router.refresh();
      } catch {
        toast.error(tc("error"));
      }
    });
  }

  function openDate() {
    setDateDraft(item.date ?? "");
    setDateOpen((v) => !v);
  }

  function openNote() {
    setNoteDraft(item.note ?? "");
    setNoteOpen((v) => !v);
  }

  return (
    <li className="-mx-5 flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[var(--surface-2)] sm:-mx-6 sm:px-6">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={item.title}
        onClick={onToggle}
        disabled={pending}
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-s)] border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)]",
          done
            ? "border-[var(--success)] bg-[var(--success)] text-[var(--on-tint)]"
            : "border-[var(--line-strong)] bg-[var(--surface)] hover:border-[var(--tint)]",
        )}
      >
        {done && <IconCheck className="size-4" stroke={3} aria-hidden />}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "break-words text-[0.9375rem] font-medium leading-snug",
            done ? "text-[var(--ink-3)] line-through decoration-1" : "text-[var(--ink)]",
          )}
        >
          {item.title}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 t-micro text-[var(--ink-3)]">
          <KindChip kind="todo" label={t("kind.todo")} />
          <button
            type="button"
            onClick={openDate}
            className={cn(
              "inline-flex items-center gap-1 transition-colors hover:text-[var(--ink)]",
              overdue ? "text-[var(--danger)]" : "text-[var(--ink-3)]",
            )}
            aria-expanded={dateOpen}
          >
            <IconCalendar className="size-3.5" aria-hidden />
            {item.date ? shortDate(item.date, locale, today.slice(0, 4)) : t("dueDate")}
          </button>
          {item.sub &&
            (item.href ? (
              <Link href={item.href} className="min-w-0 max-w-full truncate transition-colors hover:text-[var(--tint)]">
                {item.sub}
              </Link>
            ) : (
              <span className="min-w-0 max-w-full truncate">{item.sub}</span>
            ))}
          {!noteOpen && item.note && (
            <button
              type="button"
              onClick={openNote}
              className="min-w-0 max-w-full truncate text-left italic transition-colors hover:text-[var(--ink)]"
            >
              {item.note}
            </button>
          )}
        </div>

        {dateOpen && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              aria-label={t("dueDate")}
              className="h-9 w-auto min-w-0 flex-1 sm:max-w-44 sm:flex-none"
            />
            <Button
              size="sm"
              disabled={pending || dateDraft === (item.date ?? "")}
              onClick={() => run(() => updateTodo({ id: item.id, dueDate: dateDraft || null }), () => setDateOpen(false))}
            >
              {tc("save")}
            </Button>
            {item.date && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => updateTodo({ id: item.id, dueDate: null }), () => setDateOpen(false))}
              >
                <IconX className="size-4" aria-hidden />
                {t("clearDate")}
              </Button>
            )}
          </div>
        )}

        {noteOpen && (
          <div className="mt-2 space-y-2">
            <Textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder={t("notePlaceholder")}
              aria-label={t("note")}
              maxLength={5000}
              rows={3}
              className="min-h-[84px]"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)} disabled={pending}>
                {tc("cancel")}
              </Button>
              <Button
                size="sm"
                disabled={pending || noteDraft === (item.note ?? "")}
                onClick={() =>
                  run(
                    () => updateTodo({ id: item.id, note: noteDraft.trim() ? noteDraft : null }),
                    () => {
                      setNoteOpen(false);
                      toast.success(t("noteSaved"));
                    },
                  )
                }
              >
                {tc("save")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={openNote}
          aria-label={t("note")}
          aria-expanded={noteOpen}
          className={cn(
            "flex size-9 items-center justify-center rounded-[var(--radius-s)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
            item.note ? "text-[var(--tint)]" : "text-[var(--ink-3)]",
          )}
        >
          <IconNote className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label={t("delete")}
          className="flex size-9 items-center justify-center rounded-[var(--radius-s)] text-[var(--ink-3)] transition-colors hover:bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] hover:text-[var(--danger)]"
        >
          <IconTrash className="size-4" aria-hidden />
        </button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm")}</DialogTitle>
            <DialogDescription className="break-words">{item.title}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={pending}>
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(
                  () => deleteTodo(item.id),
                  () => {
                    setConfirmOpen(false);
                    toast.success(t("deleted"));
                  },
                )
              }
            >
              <IconTrash className="size-4" aria-hidden />
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
