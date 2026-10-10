"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconCircleCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui-biib/Button";
import { Field } from "@/components/ui-biib/Field";
import { Input } from "@/components/ui-biib/Input";
import { Link } from "@/i18n/navigation";
import { requestPasswordReset } from "@/server/actions/auth-flow";
import { AuthShell, AUTH_LINK } from "../_components/auth-shell";

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    await requestPasswordReset(new FormData(e.currentTarget));
    setPending(false);
    setDone(true);
  }

  return (
    <AuthShell
      title={t("auth.forgot.title")}
      footer={
        <Link href="/login" className={AUTH_LINK}>
          {t("auth.forgot.backToLogin")}
        </Link>
      }
    >
      {done ? (
        <p className="flex items-start gap-2 t-small font-medium text-[var(--success)]">
          <IconCircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          {t("auth.forgot.sent")}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <Field id="email" label={t("auth.login.email")} required>
            {(c) => <Input {...c} name="email" type="email" autoComplete="email" />}
          </Field>
          <Button type="submit" variant="primary" size="56" loading={pending} className="w-full">
            {t("auth.forgot.submit")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
