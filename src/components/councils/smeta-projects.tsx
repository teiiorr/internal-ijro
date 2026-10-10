"use client";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconPlus as Plus, IconX as X, IconFileInvoice as FileInvoice } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Status } from "@/components/ui-biib/Status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/dates";
import { localizeName } from "@/lib/names";
import { addSmetaCommissionProject, removeSmetaCommissionProject, type SmetaProjectError } from "@/server/actions/smeta-commission";
import type { SmetaCommissionProject } from "@/server/queries/smeta-commission";

/**
 * Smeta komissiyasiga yoʻnaltirilgan loyihalar: sarlavha oʻngida "Loyiha qoʻshish",
 * roʻyxat esa ajratuvchi qatorlar (quti emas). Har bir loyiha "Jarayonda" xotirjam
 * holat belgisi bilan koʻrsatiladi.
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    <Section
      title={t("title")}
      meta={items.length > 0 ? items.length : undefined}
      action={
        canAdd ? (
          <Button
            variant={open ? "ghost" : "default"}
            size="sm"
            onClick={() => (open ? close() : setOpen(true))}
            aria-expanded={open}
          >
            {open ? <X className="size-4" /> : <Plus className="size-4" />}
            {open ? t("close") : t("addProject")}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {/* Qoʻshish maydoni — "Loyiha qoʻshish" bosilganda ochiladi */}
        {canAdd && open && (
          <form onSubmit={submit} className="space-y-1.5">
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
            {error ? <p className="t-small text-[var(--danger)]">{error}</p> : <p className="t-micro text-[var(--ink-3)]">{t("hint")}</p>}
          </form>
        )}

        {canManage && !ready && (
          <p className="rounded-[var(--radius-m)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--ink-2)]">{t("errors.unavailable")}</p>
        )}

        {items.length === 0 ? (
          <Card solid bare>
            <EmptyState
              icon={FileInvoice}
              title={t("empty")}
              action={
                canAdd && !open ? (
                  <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                    <Plus className="size-4" />
                    {t("addProject")}
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <Card solid bare className="px-5 sm:px-6">
            <Rows>
              {items.map((it, i) => (
                <Row key={it.id}>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--ink-3)]">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    {it.projectId ? (
                      <Link href={`/projects/${it.projectId}`} className="break-words text-[15px] font-semibold leading-snug text-[var(--ink)] hover:text-[var(--tint)] hover:underline">
                        {it.name}
                      </Link>
                    ) : (
                      <p className="break-words text-[15px] font-semibold leading-snug text-[var(--ink)]">{it.name}</p>
                    )}
                    <p className="mt-0.5 t-micro text-[var(--ink-3)]">
                      {formatDate(it.createdAt, locale)}
                      {it.createdByName && `, ${localizeName(it.createdByName, locale)}`}
                    </p>
                  </div>
                  <Status tone="info" dot className="shrink-0">{t("inProcess")}</Status>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => remove(it)}
                      disabled={pending}
                      aria-label={t("remove")}
                      title={t("remove")}
                      className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--danger)] active:scale-95 disabled:opacity-50"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </Row>
              ))}
            </Rows>
          </Card>
        )}
      </div>
    </Section>
  );
}
