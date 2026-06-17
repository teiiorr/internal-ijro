"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    <Card className="p-2">
      <CardContent className="px-7 py-8 space-y-7">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("auth.login.title")}</h1>
          <p className="text-[var(--muted)]">{t("app.tagline")}</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.login.email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.login.password")}</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totp">{t("auth.login.totp")}</Label>
            <Input id="totp" name="totp" inputMode="numeric" maxLength={6} placeholder="123 456" className="tabular text-center text-lg tracking-[0.3em]" />
          </div>
          {error && (
            <div className="rounded-md bg-[var(--danger-soft)] border border-[var(--danger)]/20 px-4 py-3">
              <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
            </div>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {t("auth.login.submit")}
          </Button>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-sm pt-2">
            <Link href="/forgot-password" className="text-[var(--primary)] font-semibold hover:underline">
              {t("auth.login.forgot")}
            </Link>
            <Link href="/register-contractor" className="text-[var(--primary)] font-semibold hover:underline">
              {t("auth.login.registerContractor")}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
