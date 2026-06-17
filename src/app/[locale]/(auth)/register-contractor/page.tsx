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
      <div className="space-y-8">
        <div className="text-left space-y-3">
          <span className="eyebrow">№ 05 · Contractor</span>
          <h1 className="font-bold leading-[0.95] text-[2.5rem] tracking-[-0.035em]">
            {t("auth.registerContractor.title")}<span className="serif-italic">.</span>
          </h1>
        </div>
        <div className="rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] px-5 py-5">
          <p className="font-bold text-base">{t("auth.registerContractor.submitted")}</p>
        </div>
        <Link href="/login" className="uline font-bold text-[var(--foreground)] text-sm">
          {t("auth.forgot.backToLogin")}
        </Link>
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="text-left space-y-3">
        <span className="eyebrow">№ 05 · Contractor</span>
        <h1 className="font-bold leading-[0.95] text-[2.5rem] tracking-[-0.035em]">
          {t("auth.registerContractor.title")}<span className="serif-italic">.</span>
        </h1>
      </div>
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
          <div className="rounded-xl bg-[var(--danger-soft)] border-2 border-[var(--danger)] px-4 py-3">
            <p className="text-sm font-bold text-[var(--danger)]">{error}</p>
          </div>
        )}
        <Button type="submit" className="w-full" size="lg">{t("auth.registerContractor.submit")}</Button>
        <div className="pt-3 border-t-2 border-[var(--border)]">
          <Link className="uline font-bold text-sm text-[var(--foreground)]" href="/login">
            {t("auth.forgot.backToLogin")}
          </Link>
        </div>
      </form>
    </div>
  );
}
