"use client";
import { useState, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui-biib/Button";
import { Field } from "@/components/ui-biib/Field";
import { Input } from "@/components/ui-biib/Input";
import { FormMessage } from "@/components/ui-biib/FormMessage";
import { acceptInvitation } from "@/server/actions/auth-flow";
import { AuthShell } from "../../_components/auth-shell";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (fd.get("password") !== fd.get("confirm")) {
      setError(t("auth.reset.mismatch"));
      return;
    }
    fd.set("token", token);
    setPending(true);
    const res = await acceptInvitation(fd);
    setPending(false);
    if ("error" in res) setError(t("auth.invite.invalid"));
    else router.push("/login");
  }

  return (
    <AuthShell title={t("auth.invite.title")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field id="fullName" label={t("auth.invite.fullName")} required>
          {(c) => <Input {...c} name="fullName" minLength={2} autoComplete="name" />}
        </Field>
        <Field id="password" label={t("auth.invite.password")} required>
          {(c) => <Input {...c} name="password" type="password" autoComplete="new-password" minLength={8} />}
        </Field>
        <Field id="confirm" label={t("auth.invite.confirm")} required>
          {(c) => <Input {...c} name="confirm" type="password" autoComplete="new-password" minLength={8} />}
        </Field>
        <FormMessage tone="error">{error}</FormMessage>
        <Button type="submit" variant="primary" size="56" loading={pending} className="w-full">
          {t("auth.invite.submit")}
        </Button>
      </form>
    </AuthShell>
  );
}
