"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="space-y-8">
      <div className="text-left space-y-3">
        <span className="eyebrow">№ 02 · Reset</span>
        <h1 className="font-bold leading-[0.95] text-[2.5rem] tracking-[-0.035em]">
          {t("auth.forgot.title")}<span className="serif-italic">.</span>
        </h1>
      </div>
      {done ? (
        <div className="space-y-5">
          <div className="rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] px-5 py-4">
            <p className="font-bold">{t("auth.forgot.sent")}</p>
          </div>
          <Link href="/login" className="uline font-bold text-[var(--foreground)] text-sm">
            {t("auth.forgot.backToLogin")}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.login.email")}</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <Button type="submit" className="w-full" size="lg">{t("auth.forgot.submit")}</Button>
          <div className="pt-3 border-t-2 border-[var(--border)]">
            <Link className="uline font-bold text-sm text-[var(--foreground)]" href="/login">
              {t("auth.forgot.backToLogin")}
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
