"use client";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inviteEmployee } from "@/server/actions/employees";

type Dept = { id: string; name: string };
type Manager = { id: string; fullName: string };

const POSITIONS = [
  "orinbosar", "koordinator", "bolim_boshligi", "bosh_mutaxassis",
  "yetakchi_mutaxassis", "mutaxassis", "hr",
] as const;

export function InviteEmployeeForm({ departments, managers }: { departments: Dept[]; managers: Manager[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("locale", locale);
    start(async () => {
      try {
        await inviteEmployee(fd);
        router.push("/employees");
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-1.5">
        <Label htmlFor="fullName">{t("common.fullName")}</Label>
        <Input id="fullName" name="fullName" required minLength={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("common.email")}</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="position">{t("common.position")}</Label>
        <Select name="position" defaultValue="mutaxassis">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {POSITIONS.map((p) => (
              <SelectItem key={p} value={p}>{t(`positions.${p}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="departmentId">{t("common.department")}</Label>
        <Select name="departmentId">
          <SelectTrigger><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reportsToUserId">{t("employees.reportsTo")}</Label>
        <Select name="reportsToUserId">
          <SelectTrigger><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
          <SelectContent>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>{t("common.submit")}</Button>
      </div>
    </form>
  );
}
