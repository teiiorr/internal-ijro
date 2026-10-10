import { useTranslations } from "next-intl";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui-biib/Button";
import { Field } from "@/components/ui-biib/Field";
import { Input } from "@/components/ui-biib/Input";
import { isSystemSetup, setupDirektor } from "@/server/actions/setup";
import { AuthShell } from "../_components/auth-shell";

export default async function SetupPage() {
  if (await isSystemSetup()) redirect("/login");
  return <SetupForm />;
}

function SetupForm() {
  const t = useTranslations();
  return (
    <AuthShell title={t("auth.setup.title")} subtitle={t("auth.setup.subtitle")}>
      <form action={setupDirektor} className="flex flex-col gap-5">
        <Field id="fullName" label={t("auth.setup.fullName")} required>
          {(c) => <Input {...c} name="fullName" minLength={2} autoComplete="name" />}
        </Field>
        <Field id="email" label={t("auth.setup.email")} required>
          {(c) => <Input {...c} name="email" type="email" autoComplete="email" />}
        </Field>
        <Field id="password" label={t("auth.setup.password")} required>
          {(c) => <Input {...c} name="password" type="password" autoComplete="new-password" minLength={8} />}
        </Field>
        <Field id="confirm" label={t("auth.setup.confirm")} required>
          {(c) => <Input {...c} name="confirm" type="password" autoComplete="new-password" minLength={8} />}
        </Field>
        <Button type="submit" variant="primary" size="56" className="w-full">
          {t("auth.setup.submit")}
        </Button>
      </form>
    </AuthShell>
  );
}
