"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconPlus as Plus, IconInfoCircle as InfoCircle, IconChevronDown as ChevronDown } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PickerPerson } from "@/components/ui/employee-picker";
import { addResolution, updateResolution } from "@/server/actions/council-resolutions";
import { FIELD, NS, useResolutionErrorText } from "./shared";
import { ResponsibleField } from "./responsible-field";

export type AgendaOption = { id: string; topic: string };

type Values = {
  text: string;
  agendaItemId: string | null;
  responsibleUserId: string | null;
  dueDate: string | null;
};

const EMPTY: Values = { text: "", agendaItemId: null, responsibleUserId: null, dueDate: null };

function Fields({
  idPrefix,
  values,
  set,
  agendaItems,
  people,
  lockAssignment,
  taskLinked,
  disabled,
  fallbackName,
}: {
  idPrefix: string;
  values: Values;
  set: (patch: Partial<Values>) => void;
  agendaItems: AgendaOption[];
  people: PickerPerson[];
  lockAssignment?: boolean;
  /** Explains why the responsible person / due date are locked. */
  taskLinked?: boolean;
  disabled?: boolean;
  fallbackName?: string | null;
}) {
  const t = useTranslations(NS);
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-text`}>{t("text")}</Label>
        <Textarea
          id={`${idPrefix}-text`}
          value={values.text}
          maxLength={5000}
          onChange={(e) => set({ text: e.target.value })}
          placeholder={t("textPlaceholder")}
          className="min-h-[88px]"
          disabled={disabled}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={`${idPrefix}-agenda`}>{t("agendaItem")}</Label>
          <select
            id={`${idPrefix}-agenda`}
            className={FIELD}
            value={values.agendaItemId ?? ""}
            onChange={(e) => set({ agendaItemId: e.target.value || null })}
            disabled={disabled}
          >
            <option value="">{t("noAgendaItem")}</option>
            {agendaItems.map((a, i) => (
              <option key={a.id} value={a.id}>
                {`${i + 1}. ${a.topic.length > 80 ? `${a.topic.slice(0, 79)}…` : a.topic}`}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={`${idPrefix}-resp`}>{t("responsible")}</Label>
          <ResponsibleField
            id={`${idPrefix}-resp`}
            people={people}
            value={values.responsibleUserId}
            onChange={(id) => set({ responsibleUserId: id })}
            disabled={disabled || lockAssignment}
            fallbackName={fallbackName}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={`${idPrefix}-due`}>{t("dueDate")}</Label>
          <input
            id={`${idPrefix}-due`}
            type="date"
            className={FIELD}
            value={values.dueDate ?? ""}
            onChange={(e) => set({ dueDate: e.target.value || null })}
            disabled={disabled || lockAssignment}
          />
        </div>
      </div>
      {lockAssignment && taskLinked && (
        <p className="flex items-start gap-2 text-xs font-medium text-[var(--muted)]">
          <InfoCircle className="mt-px size-3.5 shrink-0" />
          <span className="min-w-0 break-words">{t("errors.task_linked")}</span>
        </p>
      )}
    </div>
  );
}

/** "Qaror bandini qoʻshish" form. `collapsible` → starts as a single button (past meetings). */
export function AddResolutionForm({
  meetingId,
  agendaItems,
  people,
  collapsible = false,
}: {
  meetingId: string;
  agendaItems: AgendaOption[];
  people: PickerPerson[];
  collapsible?: boolean;
}) {
  const t = useTranslations(NS);
  const tg = useTranslations();
  const router = useRouter();
  const errorText = useResolutionErrorText();
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState(!collapsible);
  const [values, setValues] = useState<Values>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Values>) => setValues((v) => ({ ...v, ...patch }));

  function submit() {
    const text = values.text.trim();
    if (text.length < 3) {
      setError(t("errors.textTooShort"));
      return;
    }
    setError(null);
    start(async () => {
      try {
        const res = await addResolution({
          meetingId,
          text,
          agendaItemId: values.agendaItemId,
          responsibleUserId: values.responsibleUserId,
          dueDate: values.dueDate,
        });
        if (!res.ok) {
          setError(errorText(res.error));
          return;
        }
        toast.success(t("toast.added"));
        setValues(EMPTY);
        if (collapsible) setExpanded(false);
        router.refresh();
      } catch {
        setError(tg("common.error"));
      }
    });
  }

  if (!expanded) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(true)}>
        <Plus className="size-4" />
        {t("add")}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-[var(--border-strong)] p-3 sm:p-4">
      <Fields idPrefix={`res-add-${meetingId}`} values={values} set={set} agendaItems={agendaItems} people={people} disabled={pending} />
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {collapsible && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setExpanded(false);
              setError(null);
            }}
            disabled={pending}
          >
            <ChevronDown className="size-4 rotate-180" />
            {tg("common.cancel")}
          </Button>
        )}
        <Button type="button" size="sm" onClick={submit} disabled={pending}>
          <Plus className="size-4" />
          {t("add")}
        </Button>
      </div>
    </div>
  );
}

export type EditableRow = {
  id: string;
  number: number;
  text: string;
  agendaItemId: string | null;
  responsibleUserId: string | null;
  responsibleName: string | null;
  dueDate: string | null;
  taskId: string | null;
  status: string;
};

/** Edit dialog; a tasked (or closed) point keeps its responsible person and due date. */
export function EditResolutionDialog({
  row,
  agendaItems,
  people,
  onDone,
}: {
  row: EditableRow;
  agendaItems: AgendaOption[];
  people: PickerPerson[];
  onDone: () => void;
}) {
  const t = useTranslations(NS);
  const tg = useTranslations();
  const router = useRouter();
  const errorText = useResolutionErrorText();
  const [pending, start] = useTransition();
  const [values, setValues] = useState<Values>({
    text: row.text,
    agendaItemId: row.agendaItemId,
    responsibleUserId: row.responsibleUserId,
    dueDate: row.dueDate,
  });
  const [error, setError] = useState<string | null>(null);
  const lockAssignment = !!row.taskId || row.status !== "open";
  const set = (patch: Partial<Values>) => setValues((v) => ({ ...v, ...patch }));

  function submit() {
    const text = values.text.trim();
    if (text.length < 3) {
      setError(t("errors.textTooShort"));
      return;
    }
    setError(null);
    start(async () => {
      try {
        const res = await updateResolution({
          id: row.id,
          text,
          agendaItemId: values.agendaItemId,
          ...(lockAssignment ? {} : { responsibleUserId: values.responsibleUserId, dueDate: values.dueDate }),
        });
        if (!res.ok) {
          setError(errorText(res.error));
          return;
        }
        toast.success(t("toast.updated"));
        onDone();
        router.refresh();
      } catch {
        setError(tg("common.error"));
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onDone()}>
      <DialogContent className="max-w-2xl p-5 sm:p-7">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg sm:text-xl">
            {t("editTitle")} · №{row.number}
          </DialogTitle>
        </DialogHeader>
        <Fields
          idPrefix={`res-edit-${row.id}`}
          values={values}
          set={set}
          agendaItems={agendaItems}
          people={people}
          lockAssignment={lockAssignment}
          taskLinked={!!row.taskId}
          disabled={pending}
          fallbackName={row.responsibleName}
        />
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
            {tg("common.cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {tg("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
