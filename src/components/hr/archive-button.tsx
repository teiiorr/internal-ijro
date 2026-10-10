"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { archiveEmployee, restoreEmployee } from "@/server/actions/employees";

export function ArchiveButton({ userId, status }: { userId: string; status: string }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  if (status === "archived") {
    return (
      <Button variant="outline" disabled={pending} onClick={() => start(async () => { await restoreEmployee(userId); })}>
        {t("employees.archive.btnRestore")}
      </Button>
    );
  }

  if (open) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
        />
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => start(async () => {
            await archiveEmployee(userId, date);
            setOpen(false);
          })}
        >
          {t("employees.archive.btn")}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
      </div>
    );
  }

  return <Button variant="destructive" onClick={() => setOpen(true)}>{t("employees.archive.btn")}</Button>;
}
