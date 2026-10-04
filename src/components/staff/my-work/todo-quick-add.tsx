"use client";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconLoader2, IconLock, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addTodo } from "@/server/actions/personal-todos";
import { shortDate } from "./kind-meta";

type Pending = { key: number; title: string; date: string | null };

/**
 * Shaxsiy eslatma qoʻshish: matn + ixtiyoriy sana, Enter bilan.
 * Optimistik — qator darhol paydo boʻladi, soʻng router.refresh() haqiqiy roʻyxatni olib keladi.
 */
export function TodoQuickAdd({ defaultDate = null }: { defaultDate?: string | null }) {
  const t = useTranslations("staffX.myWork");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate ?? "");
  const [, start] = useTransition();
  const [pending, addPending] = useOptimistic<Pending[], Pending>([], (list, item) => [...list, item]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    const dueDate = date || null;
    setTitle("");
    start(async () => {
      addPending({ key: Date.now(), title: value, date: dueDate });
      try {
        await addTodo({ title: value.slice(0, 500), dueDate });
        router.refresh();
      } catch {
        toast.error(tc("error"));
        setTitle(value);
      }
    });
  }

  return (
    <div className="space-y-2">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="my-work-quick-add" className="sr-only">
          {t("addPlaceholder")}
        </label>
        <Input
          id="my-work-quick-add"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("addPlaceholder")}
          maxLength={500}
          autoComplete="off"
          className="min-w-0 flex-1"
        />
        <div className="flex gap-2">
          <label htmlFor="my-work-quick-date" className="sr-only">
            {t("dueDate")}
          </label>
          <Input
            id="my-work-quick-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            title={t("dueDate")}
            className="min-w-0 flex-1 sm:w-44 sm:flex-none"
          />
          <Button type="submit" disabled={!title.trim()} className="shrink-0">
            <IconPlus className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t("add")}</span>
            <span className="sr-only sm:hidden">{t("add")}</span>
          </Button>
        </div>
      </form>

      <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
        <IconLock className="size-3.5 shrink-0" aria-hidden />
        {t("privateHint")}
      </p>

      {pending.length > 0 && (
        <ul className="space-y-1" aria-live="polite">
          {pending.map((p) => (
            <li
              key={p.key}
              className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-[15px] text-[var(--muted)]"
            >
              <IconLoader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-semibold">{p.title}</span>
              {p.date && <span className="shrink-0 text-[13px]">{shortDate(p.date, locale)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
