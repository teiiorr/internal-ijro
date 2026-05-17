"use client";
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
        <F name="birthDate" label="Birth date" type="date" defaultValue={p.birthDate} />
        <F name="maritalStatus" label="Marital status" defaultValue={p.maritalStatus} />
        <F name="passportSerial" label="Passport serial" defaultValue={p.passportSerial} />
        <F name="passportNumber" label="Passport number" defaultValue={p.passportNumber} />
        <F name="passportIssuedDate" label="Passport issued date" type="date" defaultValue={p.passportIssuedDate} />
        <F name="passportIssuedBy" label="Passport issued by" defaultValue={p.passportIssuedBy} />
        <F name="inn" label="INN" defaultValue={p.inn} />
        <F name="emergencyContactName" label="Emergency contact name" defaultValue={p.emergencyContactName} />
        <F name="emergencyContactPhone" label="Emergency contact phone" defaultValue={p.emergencyContactPhone} />
        <F name="emergencyContactRelation" label="Relation" defaultValue={p.emergencyContactRelation} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" name="address" rows={2} defaultValue={p.address ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="education">Education</Label>
        <Textarea id="education" name="education" rows={2} defaultValue={p.education ?? ""} />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>Save</Button>
        {ok && <span className="text-sm text-[var(--success)]">Saved</span>}
      </div>
    </form>
  );
}
