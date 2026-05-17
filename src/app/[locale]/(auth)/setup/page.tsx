import { useTranslations } from "next-intl";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSystemSetup, setupDirektor } from "@/server/actions/setup";

export default async function SetupPage() {
  if (await isSystemSetup()) redirect("/login");
  return <SetupForm />;
}

function SetupForm() {
  const t = useTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("auth.setup.title")}</CardTitle>
        <CardDescription>{t("auth.setup.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={setupDirektor} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">{t("auth.setup.fullName")}</Label>
            <Input id="fullName" name="fullName" required minLength={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.setup.email")}</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.setup.password")}</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">{t("auth.setup.confirm")}</Label>
            <Input id="confirm" name="confirm" type="password" required minLength={8} />
          </div>
          <Button type="submit" className="w-full">{t("auth.setup.submit")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
