"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconPencil as Pencil, IconTrash as Trash2, IconPlus as Plus, IconX as X } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatCurrency } from "@/lib/format";
import { addSmetaItem, updateSmetaItem, deleteSmetaItem } from "@/server/actions/smeta";
import type { ProjectSmeta, SmetaItem } from "@/server/queries/smeta";

type FormState = {
  category: string;
  description: string;
  plannedAmount: string;
  actualAmount: string;
  currency: string;
};

const emptyForm = (currency: string): FormState => ({
  category: "",
  description: "",
  plannedAmount: "",
  actualAmount: "",
  currency,
});

/**
 * Loyiha smetasi — reja/fakt harajat moddalari jadvali (valyuta bo'yicha jami + farq).
 * Faqat pulni ko'ra oladigan foydalanuvchiga ko'rsatiladi (gating loyiha sahifasida).
 * `canEdit` — pulni tahrirlay oladigan muharrir bo'lsa, inline qo'shish/tahrir/o'chirish.
 */
export function SmetaSection({
  projectId,
  smeta,
  defaultCurrency = "UZS",
  canEdit,
}: {
  projectId: string;
  smeta: ProjectSmeta;
  defaultCurrency?: string;
  canEdit: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  // null = qo'shish rejimi; id = shu moddani tahrirlash rejimi.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(defaultCurrency));

  const { items, totals } = smeta;
  const money = (amount: number, currency: string) =>
    formatCurrency(amount, locale, currency, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  // Farq rangi: musbat → tejaldi (success), manfiy → oshdi (danger), 0 → neytral.
  const varianceClass = (v: number) =>
    v > 0 ? "text-[var(--success)]" : v < 0 ? "text-[var(--danger)]" : "text-[var(--ink-2)]";

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm(defaultCurrency));
    setShowForm(true);
  }

  function openEdit(item: SmetaItem) {
    setEditingId(item.id);
    setForm({
      category: item.category,
      description: item.description ?? "",
      plannedAmount: item.plannedAmount ?? "",
      actualAmount: item.actualAmount ?? "",
      currency: item.currency,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm(defaultCurrency));
  }

  function submit() {
    const category = form.category.trim();
    if (!category) {
      toast.error(t("projects.smeta.categoryRequired"));
      return;
    }
    const planned = Number(form.plannedAmount) || 0;
    const actualRaw = form.actualAmount.trim();
    const actual = actualRaw === "" ? null : Number(actualRaw) || 0;
    const currency = form.currency.trim() || "UZS";
    const description = form.description.trim() || null;

    start(async () => {
      const r = editingId
        ? await updateSmetaItem({ id: editingId, category, description, plannedAmount: planned, actualAmount: actual, currency })
        : await addSmetaItem({ projectId, category, description, plannedAmount: planned, actualAmount: actual, currency });
      if (!r.ok) {
        toast.error(t(`common.actionErrors.${r.error}` as "common.actionErrors.not_found"));
        return;
      }
      toast.success(t("common.saved"));
      closeForm();
      router.refresh();
    });
  }

  async function remove(item: SmetaItem) {
    if (!(await confirm({ description: t("projects.smeta.confirmDelete", { name: item.category }), tone: "danger" }))) return;
    start(async () => {
      const r = await deleteSmetaItem(item.id);
      if (!r.ok) {
        toast.error(t(`common.actionErrors.${r.error}` as "common.actionErrors.not_found"));
        return;
      }
      toast.success(t("common.saved"));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 && !showForm ? (
        <p className="t-small text-[var(--ink-3)]">{t("projects.smeta.empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("projects.smeta.category")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("projects.smeta.description")}</TableHead>
              <TableHead className="text-right">{t("projects.smeta.planned")}</TableHead>
              <TableHead className="text-right">{t("projects.smeta.actual")}</TableHead>
              <TableHead className="text-right">{t("projects.smeta.variance")}</TableHead>
              {canEdit && <TableHead className="text-right">{t("common.actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const planned = Number(item.plannedAmount) || 0;
              const actual = item.actualAmount != null ? Number(item.actualAmount) || 0 : null;
              const variance = actual != null ? planned - actual : null;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-[var(--ink)]">
                    {item.category}
                    {item.description && <span className="mt-0.5 block t-micro text-[var(--ink-3)] sm:hidden">{item.description}</span>}
                  </TableCell>
                  <TableCell className="hidden max-w-xs text-[var(--ink-2)] sm:table-cell">
                    <span className="block truncate">{item.description || t("common.emptyValue")}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-[var(--ink)]">{money(planned, item.currency)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-[var(--ink-2)]">
                    {actual != null ? money(actual, item.currency) : t("common.emptyValue")}
                  </TableCell>
                  <TableCell className={`whitespace-nowrap text-right font-semibold tabular-nums ${variance != null ? varianceClass(variance) : "text-[var(--ink-3)]"}`}>
                    {variance != null ? money(variance, item.currency) : t("common.emptyValue")}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={t("common.edit")} onClick={() => openEdit(item)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={t("common.delete")} onClick={() => remove(item)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}

            {/* Valyuta bo'yicha jami — har bir valyuta uchun alohida qator */}
            {totals.perCurrency.map((ct) => (
              <TableRow key={`total-${ct.currency}`} className="border-t-2 border-[var(--line)] bg-[var(--surface-2)] hover:bg-[var(--surface-2)]">
                <TableCell className="font-bold text-[var(--ink)]">{t("projects.smeta.total", { currency: ct.currency })}</TableCell>
                <TableCell className="hidden sm:table-cell" />
                <TableCell className="whitespace-nowrap text-right font-bold tabular-nums text-[var(--ink)]">{money(ct.planned, ct.currency)}</TableCell>
                <TableCell className="whitespace-nowrap text-right font-bold tabular-nums text-[var(--ink)]">{money(ct.actual, ct.currency)}</TableCell>
                <TableCell className={`whitespace-nowrap text-right font-bold tabular-nums ${varianceClass(ct.variance)}`}>{money(ct.variance, ct.currency)}</TableCell>
                {canEdit && <TableCell />}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Qo'shish / tahrirlash shakli — telefonda bitta ustun */}
      {canEdit && showForm && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="t-micro text-[var(--ink-3)]">{t("projects.smeta.category")}</span>
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} maxLength={120} autoFocus />
            </label>
            <label className="flex flex-col gap-1">
              <span className="t-micro text-[var(--ink-3)]">{t("projects.smeta.currency")}</span>
              <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} maxLength={10} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="t-micro text-[var(--ink-3)]">{t("projects.smeta.planned")}</span>
              <MoneyInput value={form.plannedAmount} onValueChange={(v) => setForm((f) => ({ ...f, plannedAmount: v }))} placeholder="0" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="t-micro text-[var(--ink-3)]">{t("projects.smeta.actual")}</span>
              <MoneyInput value={form.actualAmount} onValueChange={(v) => setForm((f) => ({ ...f, actualAmount: v }))} placeholder={t("projects.smeta.actualOptional")} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="t-micro text-[var(--ink-3)]">{t("projects.smeta.description")}</span>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={2000} />
          </label>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={closeForm} disabled={pending}>
              <X className="size-4" /> {t("common.cancel")}
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {editingId ? t("common.save") : t("projects.smeta.add")}
            </Button>
          </div>
        </div>
      )}

      {canEdit && !showForm && (
        <div>
          <Button variant="outline" size="sm" onClick={openAdd} disabled={pending}>
            <Plus className="size-4" /> {t("projects.smeta.add")}
          </Button>
        </div>
      )}
    </div>
  );
}
