import { useTranslations } from "next-intl";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSystemSetup, setupDirektor } from "@/server/actions/setup";

export default async function SetupPage() {
  if (await isSystemSetup()) redirect("/login");
  return <SetupForm />;
}

function SetupForm() {
  const t = useTranslations();
  return (
    <div className="space-y-8">
      <div className="text-left space-y-3">
        <span className="eyebrow">№ 00 · Setup</span>
        <h1 className="font-bold leading-[0.95] text-[2.5rem] tracking-[-0.035em]">
          {t("auth.setup.title")}<span className="serif-italic">.</span>
        </h1>
        <p className="text-[var(--muted)] font-medium">{t("auth.setup.subtitle")}</p>
      </div>
      <form action={setupDirektor} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="fullName">{t("auth.setup.fullName")}</Label>
          <Input id="fullName" name="fullName" required minLength={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.setup.email")}</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.setup.password")}</Label>
          <Input id="password" name="password" type="password" required minLength={8} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t("auth.setup.confirm")}</Label>
          <Input id="confirm" name="confirm" type="password" required minLength={8} />
        </div>
        <Button type="submit" className="w-full" size="lg">{t("auth.setup.submit")}</Button>
      </form>
    </div>
  );
}
