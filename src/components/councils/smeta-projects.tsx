"use client";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconPlus as Plus, IconX as X, IconFileInvoice as FileInvoice } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { addSmetaCommissionProject, removeSmetaCommissionProject, type SmetaProjectError } from "@/server/actions/smeta-commission";
import type { SmetaCommissionProject } from "@/server/queries/smeta-commission";

/** "Jarayonda" belgisi: navbat bilan sakraydigan uchta sariq nuqta + yozuv. */
function InProcess({ className }: { className: string }) {
  const t = useTranslations("kengash.smetaProjects");
  return (
    <span className={cn("shrink-0 items-center gap-2 rounded-md bg-[#EAB308]/15 px-3 py-1.5 text-xs font-bold text-[#7A5A00] dark:text-[#FACC15]", className)}>
      <span className="process-dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      {t("inProcess")}
    </span>
  );
}

/**
 * Smeta komissiyasiga yoʻnaltirilgan loyihalar: "+" tugmasi nom kiritish maydonini ochadi
 * (tizimdagi loyihalar taklif qilinadi); roʻyxat topshirilgan tartibda raqamlanib,
 * har biri "Jarayonda" holatida koʻrsatiladi.
 */
export function SmetaProjects({
  items,
  projects,
  canManage,
  ready,
}: {
  items: SmetaCommissionProject[];
  projects: { id: string; name: string }[];
  canManage: boolean;
  ready: boolean;
}) {
  const t = useTranslations("kengash.smetaProjects");
  const locale = useLocale();
  const router = useRouter();
  const listId = useId();
  const formId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const canAdd = canManage && ready;

  // Maydon ochilishi bilan kursor unga tushadi.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setName("");
    setError(null);
  }

  const taken = useMemo(() => new Set(items.map((i) => i.name.toLowerCase())), [items]);
  const suggestions = useMemo(() => projects.filter((p) => !taken.has(p.name.toLowerCase())), [projects, taken]);
  const errorText = (e: SmetaProjectError) => t(`errors.${e}`);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = name.trim().replace(/\s+/g, " ");
    if (v.length < 2) return setError(errorText("invalid"));
    if (taken.has(v.toLowerCase())) return setError(errorText("duplicate"));
    setError(null);
    start(async () => {
      const r = await addSmetaCommissionProject(v);
      if (!r.ok) return setError(errorText(r.error));
      // Maydon ochiq qoladi — ketma-ket bir nechta loyiha qoʻshish qulay boʻlsin.
      setName("");
      setLastAdded(v.toLowerCase());
      toast.success(t("added"));
      router.refresh();
      inputRef.current?.focus();
    });
  }

  function remove(it: SmetaCommissionProject) {
    if (!window.confirm(t("confirmRemove", { name: it.name }))) return;
    start(async () => {
      const r = await removeSmetaCommissionProject(it.id);
      if (!r.ok) return void toast.error(errorText(r.error));
      toast.success(t("removed"));
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 text-lg font-bold tracking-tight sm:text-xl">
            {t("title")}
            <span className="ml-2 inline-grid h-7 min-w-7 place-items-center rounded-full bg-[var(--primary-soft)] px-2 align-middle text-sm font-bold tabular-nums text-[var(--primary)]">
              {items.length}
            </span>
          </h2>
          {canAdd && (
            <button
              type="button"
              onClick={() => (open ? close() : setOpen(true))}
              aria-expanded={open}
              aria-controls={formId}
              aria-label={open ? t("close") : t("addProject")}
              title={open ? t("close") : t("addProject")}
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full shadow-[var(--shadow-1)] transition-colors duration-200 active:scale-95",
                open ? "bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-3)]" : "bg-[var(--primary)] text-white hover:brightness-110"
              )}
            >
              <Plus className={cn("size-5 transition-transform duration-300", open && "rotate-45")} />
            </button>
          )}
        </div>

        {/* "+" bosilganda silliq ochiladigan maydon; yopiqligida joy egallamaydi va fokuslanmaydi. */}
        {canAdd && (
          <div
            id={formId}
            inert={!open}
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
              open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="-mx-1 min-h-0 overflow-hidden px-1">
              <form onSubmit={submit} className="space-y-1.5 pb-1 pt-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    ref={inputRef}
                    value={name}
                    onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
                    onKeyDown={(e) => { if (e.key === "Escape") close(); }}
                    list={listId}
                    maxLength={300}
                    placeholder={t("placeholder")}
                    aria-label={t("placeholder")}
                    className="sm:flex-1"
                  />
                  <datalist id={listId}>
                    {suggestions.map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                  <Button type="submit" disabled={pending || name.trim().length < 2} className="w-full sm:w-auto">
                    <Plus className="size-4" />
                    {t("add")}
                  </Button>
                </div>
                {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : <p className="text-xs text-[var(--subtle)]">{t("hint")}</p>}
              </form>
            </div>
          </div>
        )}
        {canManage && !ready && (
          <p className="mt-4 rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted)]">{t("errors.unavailable")}</p>
        )}

        {items.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-10 text-center">
            <FileInvoice className="size-7 text-[var(--subtle)]" />
            <p className="text-sm font-semibold text-[var(--muted)]">{t("empty")}</p>
            {canAdd && !open && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-1 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary-soft)] active:scale-95"
              >
                <Plus className="size-4" />
                {t("addProject")}
              </button>
            )}
          </div>
        ) : (
          <ol className="mt-4 space-y-2">
            {items.map((it, i) => (
              <li
                key={it.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--border-strong)] sm:p-3.5",
                  lastAdded === it.name.toLowerCase() && "animate-[item-enter_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--surface-2)] text-sm font-bold tabular-nums text-[var(--muted)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {it.projectId ? (
                    <Link href={`/projects/${it.projectId}`} className="break-words text-[15px] font-semibold leading-snug hover:text-[var(--primary)] hover:underline">
                      {it.name}
                    </Link>
                  ) : (
                    <p className="break-words text-[15px] font-semibold leading-snug">{it.name}</p>
                  )}
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {formatDate(it.createdAt, locale)}
                    {it.createdByName && ` · ${localizeName(it.createdByName, locale)}`}
                  </p>
                  <InProcess className="mt-2 inline-flex sm:hidden" />
                </div>
                <InProcess className="hidden sm:inline-flex" />
                {canManage && (
                  <button
                    type="button"
                    onClick={() => remove(it)}
                    disabled={pending}
                    aria-label={t("remove")}
                    title={t("remove")}
                    className="grid size-9 shrink-0 place-items-center rounded-xl text-[var(--subtle)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] active:scale-95 disabled:opacity-50"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
