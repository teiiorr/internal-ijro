"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <div className="glass-strong rounded-3xl p-7 sm:p-8 space-y-4 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight gradient-text">{t("auth.registerContractor.title")}</h1>
        <div className="rounded-2xl bg-[var(--success-soft)] border border-[var(--success)]/20 px-4 py-4">
          <p className="text-sm font-bold text-[var(--success)]">{t("auth.registerContractor.submitted")}</p>
        </div>
        <Link href="/login" className="inline-block text-[var(--primary)] font-bold hover:underline text-sm">
          {t("auth.forgot.backToLogin")}
        </Link>
      </div>
    );

  return (
    <div className="glass-strong rounded-3xl p-7 sm:p-8 space-y-6">
      <h1 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight gradient-text">{t("auth.registerContractor.title")}</h1>
      <form onSubmit={onSubmit} className="space-y-5">
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
            <p className="text-sm font-bold text-[var(--danger)]">{error}</p>
          </div>
        )}
        <Button type="submit" className="w-full" size="lg">{t("auth.registerContractor.submit")}</Button>
        <div className="text-center pt-2">
          <Link className="text-sm text-[var(--muted)] hover:text-[var(--primary)] font-semibold transition-colors" href="/login">
            {t("auth.forgot.backToLogin")}
          </Link>
        </div>
      </form>
    </div>
  );
}
