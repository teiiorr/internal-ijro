"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { requestPasswordReset } from "@/server/actions/auth-flow";

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await requestPasswordReset(new FormData(e.currentTarget));
    setDone(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("auth.forgot.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="space-y-4">
            <p className="text-sm">{t("auth.forgot.sent")}</p>
            <Link className="text-[var(--primary)] hover:underline text-sm" href="/login">
              {t("auth.forgot.backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.login.email")}</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" className="w-full">{t("auth.forgot.submit")}</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
