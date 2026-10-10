"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { IconUserPlus as UserPlus, IconX as X } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmployeePicker, type PickerPerson } from "@/components/ui/employee-picker";
import { UserAvatar } from "@/components/ui/user-avatar";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { NS } from "./shared";

/**
 * Single-select responsible person: a compact button that opens the big
 * EmployeePicker in a dialog (onToggle replaces the selection and closes it).
 */
export function ResponsibleField({
  people,
  value,
  onChange,
  disabled,
  fallbackName,
  id,
}: {
  people: PickerPerson[];
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  /** Name to show when the current value is not in `people` (e.g. an archived user). */
  fallbackName?: string | null;
  id?: string;
}) {
  const t = useTranslations(NS);
  const tg = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const selected = value ? people.find((p) => p.id === value) : undefined;
  const name = selected?.fullName ?? (value ? fallbackName : null);

  return (
    <div className="flex min-w-0 items-center gap-1">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-control)] border px-2.5 text-left text-sm font-medium transition-colors disabled:opacity-60",
          name
            ? "border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)]"
            : "border-dashed border-[var(--line-strong)] bg-transparent text-[var(--ink-2)] hover:border-[var(--tint)] hover:text-[var(--tint)]"
        )}
      >
        {name ? (
          <>
            <UserAvatar name={name} avatarUrl={selected?.avatarUrl} size="xs" clickable={false} className="!size-6" />
            <span className="min-w-0 truncate">{localizeName(name, locale)}</span>
          </>
        ) : (
          <>
            <UserPlus className="size-4 shrink-0" />
            <span className="min-w-0 truncate">{t("chooseResponsible")}</span>
          </>
        )}
      </button>
      {name && !disabled && (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={t("clearResponsible")}
          title={t("clearResponsible")}
          onClick={() => onChange(null)}
          className="shrink-0 text-[var(--ink-3)]"
        >
          <X className="size-4" />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-4 sm:p-7">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg sm:text-xl">{t("chooseResponsible")}</DialogTitle>
          </DialogHeader>
          <EmployeePicker
            people={people}
            selectedIds={value ? [value] : []}
            onToggle={(pid) => {
              onChange(pid === value ? null : pid);
              setOpen(false);
            }}
            positionLabel={(p) => tg(`positions.${p}`)}
            formatName={(n) => localizeName(n, locale)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
