"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="p-2">
      <CardContent className="px-7 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{t("auth.forgot.title")}</h1>
        </div>
        {done ? (
          <div className="space-y-4 text-center">
            <div className="rounded-2xl bg-[var(--success-soft)] border border-[var(--success)]/20 px-4 py-4">
              <p className="text-sm font-medium text-[var(--success)]">{t("auth.forgot.sent")}</p>
            </div>
            <Link className="inline-block text-[var(--primary)] font-semibold hover:underline text-sm" href="/login">
              {t("auth.forgot.backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.login.email")}</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" className="w-full" size="lg">{t("auth.forgot.submit")}</Button>
            <div className="text-center pt-2">
              <Link className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition-colors" href="/login">
                {t("auth.forgot.backToLogin")}
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
