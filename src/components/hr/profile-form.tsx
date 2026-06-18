"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { upsertEmployeeProfile } from "@/server/actions/employees";

type ProfileLike = {
  birthDate?: string | null;
  passportSerial?: string | null;
  passportNumber?: string | null;
  passportIssuedBy?: string | null;
  passportIssuedDate?: string | null;
  inn?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  maritalStatus?: string | null;
  education?: string | null;
  notesHr?: string | null;
};

export function ProfileForm({ userId, profile }: { userId: string; profile: ProfileLike | null }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [ok, setOk] = useState(false);
  const p = profile ?? {};

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOk(false);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await upsertEmployeeProfile({
        userId,
        birthDate: (fd.get("birthDate") as string) || null,
        passportSerial: (fd.get("passportSerial") as string) || null,
        passportNumber: (fd.get("passportNumber") as string) || null,
        passportIssuedBy: (fd.get("passportIssuedBy") as string) || null,
        passportIssuedDate: (fd.get("passportIssuedDate") as string) || null,
        inn: (fd.get("inn") as string) || null,
        address: (fd.get("address") as string) || null,
        emergencyContactName: (fd.get("emergencyContactName") as string) || null,
        emergencyContactPhone: (fd.get("emergencyContactPhone") as string) || null,
        emergencyContactRelation: (fd.get("emergencyContactRelation") as string) || null,
        maritalStatus: (fd.get("maritalStatus") as string) || null,
        education: (fd.get("education") as string) || null,
        notesHr: (fd.get("notesHr") as string) || null,
      });
      setOk(true);
    });
  }

  const F = ({ name, label, defaultValue, type = "text" }: { name: string; label: string; defaultValue?: string | null; type?: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} />
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <F name="birthDate" label={t("employees.profile.birthDate")} type="date" defaultValue={p.birthDate} />
        <F name="maritalStatus" label={t("employees.profile.maritalStatus")} defaultValue={p.maritalStatus} />
        <F name="passportSerial" label={t("employees.profile.passportSerial")} defaultValue={p.passportSerial} />
        <F name="passportNumber" label={t("employees.profile.passportNumber")} defaultValue={p.passportNumber} />
        <F name="passportIssuedDate" label={t("employees.profile.passportIssuedDate")} type="date" defaultValue={p.passportIssuedDate} />
        <F name="passportIssuedBy" label={t("employees.profile.passportIssuedBy")} defaultValue={p.passportIssuedBy} />
        <F name="inn" label={t("employees.profile.inn")} defaultValue={p.inn} />
        <F name="emergencyContactName" label={t("employees.profile.emergencyContactName")} defaultValue={p.emergencyContactName} />
        <F name="emergencyContactPhone" label={t("employees.profile.emergencyContactPhone")} defaultValue={p.emergencyContactPhone} />
        <F name="emergencyContactRelation" label={t("employees.profile.emergencyContactRelation")} defaultValue={p.emergencyContactRelation} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">{t("employees.profile.address")}</Label>
        <Textarea id="address" name="address" rows={2} defaultValue={p.address ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="education">{t("employees.profile.education")}</Label>
        <Textarea id="education" name="education" rows={2} defaultValue={p.education ?? ""} />
      </div>
      <div className="flex items-center justify-end gap-3 pt-2">
        {ok && <span className="text-sm text-[var(--success)]">{t("common.saved")}</span>}
        <Button type="submit" disabled={pending}>{t("common.save")}</Button>
      </div>
    </form>
  );
}
