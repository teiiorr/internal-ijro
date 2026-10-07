"use client";
import { useId, useMemo, useState, useTransition } from "react";
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
    <span className={cn("shrink-0 items-center gap-2 rounded-full bg-[#EAB308]/15 px-3 py-1.5 text-xs font-bold text-[#7A5A00] dark:text-[#FACC15]", className)}>
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
 * Smeta komissiyasiga oʻtgan loyihalar: nom kiritiladi (tizimdagi loyihalar taklif qilinadi),
 * roʻyxat topshirilgan tartibda raqamlanib, har biri "Jarayonda" holatida koʻrsatiladi.
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
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

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
      setName("");
      setLastAdded(v.toLowerCase());
      toast.success(t("added"));
      router.refresh();
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
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">{t("title")}</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">{t("subtitle")}</p>
          </div>
          <span className="grid h-9 min-w-9 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] px-3 text-sm font-bold tabular-nums text-[var(--primary)]">
            {items.length}
          </span>
        </div>

        {canManage &&
          (ready ? (
            <form onSubmit={submit} className="space-y-1.5">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
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
          ) : (
            <p className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted)]">{t("errors.unavailable")}</p>
          ))}

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-10 text-center">
            <FileInvoice className="size-7 text-[var(--subtle)]" />
            <p className="text-sm font-semibold text-[var(--muted)]">{t("empty")}</p>
          </div>
        ) : (
          <ol className="space-y-2">
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
