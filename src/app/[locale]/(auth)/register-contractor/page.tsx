"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { registerContractor } from "@/server/actions/auth-flow";
import { Link } from "@/i18n/navigation";

export default function RegisterContractorPage() {
  const t = useTranslations();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const res = await registerContractor(new FormData(e.currentTarget));
    if ("error" in res) setError(res.error ?? "invalid");
    else setDone(true);
  }

  if (done)
    return (
      <Card>
        <CardHeader><CardTitle>{t("auth.registerContractor.title")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{t("auth.registerContractor.submitted")}</p>
          <Link href="/login" className="text-[var(--primary)] hover:underline text-sm">
            {t("auth.forgot.backToLogin")}
          </Link>
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader><CardTitle>{t("auth.registerContractor.title")}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {(
            [
              ["companyName", t("auth.registerContractor.companyName"), "text"],
              ["contactPerson", t("auth.registerContractor.contactPerson"), "text"],
              ["contactEmail", t("auth.registerContractor.contactEmail"), "email"],
              ["contactPhone", t("auth.registerContractor.contactPhone"), "tel"],
              ["password", t("auth.registerContractor.password"), "password"],
            ] as const
          ).map(([name, label, type]) => (
            <div key={name} className="space-y-1.5">
              <Label htmlFor={name}>{label}</Label>
              <Input id={name} name={name} type={type} required={name !== "contactPhone"} />
            </div>
          ))}
          {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
          <Button type="submit" className="w-full">{t("auth.registerContractor.submit")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
