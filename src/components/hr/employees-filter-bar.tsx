"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Search, Download, Building2, Briefcase, Activity } from "lucide-react";

type Dept = { id: string; name: string };
const POSITIONS = [
  "direktor", "orinbosar", "koordinator", "bolim_boshligi",
  "bosh_mutaxassis", "yetakchi_mutaxassis", "mutaxassis", "hr",
] as const;
const STATUSES = ["active", "pending", "archived", "blocked"] as const;

export function EmployeesFilterBar({ departments }: { departments: Dept[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const t = useTranslations();

  function update(key: string, value: string) {
    const next = new URLSearchParams(sp);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    start(() => router.replace(`/employees?${next.toString()}`));
  }

  const exportUrl = `/api/export/employees?${sp.toString()}`;

  return (
    <div className="grid gap-3 md:grid-cols-5">
      <div className="relative md:col-span-2">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          placeholder={t("common.search")}
          defaultValue={sp.get("q") ?? ""}
          className="pl-9"
          onChange={(e) => update("q", e.target.value)}
        />
      </div>
      <Select defaultValue={sp.get("departmentId") ?? "all"} onValueChange={(v) => update("departmentId", v)}>
        <SelectTrigger>
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="size-4 shrink-0 text-[var(--muted)]" />
            <SelectValue placeholder={t("nav.departments")} />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("common.all")}</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select defaultValue={sp.get("position") ?? "all"} onValueChange={(v) => update("position", v)}>
        <SelectTrigger>
          <span className="flex min-w-0 items-center gap-2">
            <Briefcase className="size-4 shrink-0 text-[var(--muted)]" />
            <SelectValue placeholder={t("common.position")} />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("common.all")}</SelectItem>
          {POSITIONS.map((p) => (
            <SelectItem key={p} value={p}>{t(`positions.${p}`)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Select defaultValue={sp.get("status") ?? "all"} onValueChange={(v) => update("status", v)}>
          <SelectTrigger>
            <span className="flex min-w-0 items-center gap-2">
              <Activity className="size-4 shrink-0 text-[var(--muted)]" />
              <SelectValue placeholder={t("common.status")} />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild variant="outline" disabled={pending}>
          <a href={exportUrl}><Download className="size-4 mr-1" /> XLSX</a>
        </Button>
      </div>
    </div>
  );
}
