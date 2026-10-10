"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconCircleCheck, IconEye, IconEyeOff } from "@tabler/icons-react";
import { Button } from "@/components/ui-biib/Button";
import { Field } from "@/components/ui-biib/Field";
import { Input } from "@/components/ui-biib/Input";
import { FormMessage } from "@/components/ui-biib/FormMessage";
import { registerContractor } from "@/server/actions/auth-flow";
import { Link } from "@/i18n/navigation";
import { AuthShell, AUTH_LINK } from "../_components/auth-shell";

export default function RegisterContractorPage() {
  const t = useTranslations();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await registerContractor(new FormData(e.currentTarget));
    setPending(false);
    if ("error" in res) setError(res.error ?? t("auth.login.invalid"));
    else setDone(true);
  }

  if (done)
    return (
      <AuthShell
        title={t("auth.registerContractor.title")}
        footer={
          <Link href="/login" className={AUTH_LINK}>
            {t("auth.forgot.backToLogin")}
          </Link>
        }
      >
        <p className="flex items-start gap-2 t-small font-medium text-[var(--success)]">
          <IconCircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          {t("auth.registerContractor.submitted")}
        </p>
      </AuthShell>
    );

  return (
    <AuthShell
      title={t("auth.registerContractor.title")}
      footer={
        <Link href="/login" className={AUTH_LINK}>
          {t("auth.forgot.backToLogin")}
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field id="companyName" label={t("auth.registerContractor.companyName")} required>
          {(c) => <Input {...c} name="companyName" autoComplete="organization" />}
        </Field>
        <Field id="contactPerson" label={t("auth.registerContractor.contactPerson")} required>
          {(c) => <Input {...c} name="contactPerson" autoComplete="name" />}
        </Field>
        <Field id="contactEmail" label={t("auth.registerContractor.contactEmail")} required>
          {(c) => <Input {...c} name="contactEmail" type="email" autoComplete="email" />}
        </Field>
        <Field id="contactPhone" label={t("auth.registerContractor.contactPhone")}>
          {(c) => <Input {...c} name="contactPhone" type="tel" autoComplete="tel" />}
        </Field>
        <Field id="password" label={t("auth.registerContractor.password")} required>
          {(c) => (
            <div className="relative">
              <Input
                {...c}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pe-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-label={t("auth.registerContractor.password")}
                className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
              >
                {showPassword ? <IconEyeOff className="size-5" aria-hidden /> : <IconEye className="size-5" aria-hidden />}
              </button>
            </div>
          )}
        </Field>
        <FormMessage tone="error">{error}</FormMessage>
        <Button type="submit" variant="primary" size="56" loading={pending} className="w-full">
          {t("auth.registerContractor.submit")}
        </Button>
      </form>
    </AuthShell>
  );
}
