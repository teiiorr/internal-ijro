"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { IconShieldLock } from "@tabler/icons-react";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui-biib/Button";
import { Field } from "@/components/ui-biib/Field";
import { Input } from "@/components/ui-biib/Input";
import { FormMessage } from "@/components/ui-biib/FormMessage";
import { AuthShell, AUTH_LINK } from "../_components/auth-shell";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showTotp, setShowTotp] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      totp: String(fd.get("totp") ?? ""),
      redirect: false,
    });
    setPending(false);
    if (res?.error) setError(t("auth.login.invalid"));
    else router.push("/dashboard");
  }

  return (
    <AuthShell
      title={t("auth.login.title")}
      subtitle={t("app.tagline")}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Link href="/forgot-password" className={AUTH_LINK}>
            {t("auth.login.forgot")}
          </Link>
          <Link href="/register-contractor" className={AUTH_LINK}>
            {t("auth.login.registerContractor")}
          </Link>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field id="email" label={t("auth.login.email")} required>
          {(c) => (
            /* type=text — studiyalar handle, xodimlar email bilan kiradi */
            <Input {...c} name="email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} />
          )}
        </Field>

        <Field id="password" label={t("auth.login.password")} required>
          {(c) => <Input {...c} name="password" type="password" autoComplete="current-password" />}
        </Field>

        {showTotp ? (
          <Field id="totp" label={t("auth.login.totp")}>
            {(c) => (
              <Input
                {...c}
                name="totp"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="text-center text-lg font-bold tracking-[0.4em] tabular-nums"
              />
            )}
          </Field>
        ) : (
          <button
            type="button"
            onClick={() => setShowTotp(true)}
            className="inline-flex items-center gap-1.5 self-start t-label text-[var(--ink-2)] transition-colors hover:text-[var(--ink)]"
          >
            <IconShieldLock className="size-4" aria-hidden />
            {t("auth.login.totp")}
          </button>
        )}

        <FormMessage tone="error">{error}</FormMessage>

        <Button type="submit" variant="primary" size="56" loading={pending} className="w-full">
          {t("auth.login.submit")}
        </Button>
      </form>
    </AuthShell>
  );
}
