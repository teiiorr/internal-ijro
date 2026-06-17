"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
      <Card className="p-2">
        <CardContent className="px-7 py-8 space-y-4 text-center">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{t("auth.registerContractor.title")}</h1>
          <div className="rounded-2xl bg-[var(--success-soft)] border border-[var(--success)]/20 px-4 py-4">
            <p className="text-sm font-medium text-[var(--success)]">{t("auth.registerContractor.submitted")}</p>
          </div>
          <Link href="/login" className="inline-block text-[var(--primary)] font-semibold hover:underline text-sm">
            {t("auth.forgot.backToLogin")}
          </Link>
        </CardContent>
      </Card>
    );

  return (
    <Card className="p-2">
      <CardContent className="px-7 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{t("auth.registerContractor.title")}</h1>
        </div>
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
            <div key={name} className="space-y-2">
              <Label htmlFor={name}>{label}</Label>
              <Input id={name} name={name} type={type} required={name !== "contactPhone"} />
            </div>
          ))}
          {error && (
            <div className="rounded-2xl bg-[var(--danger-soft)] border border-[var(--danger)]/20 px-4 py-3">
              <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
            </div>
          )}
          <Button type="submit" className="w-full" size="lg">{t("auth.registerContractor.submit")}</Button>
          <div className="text-center pt-2">
            <Link className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition-colors" href="/login">
              {t("auth.forgot.backToLogin")}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
