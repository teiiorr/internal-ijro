"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>{t("auth.login.title")}</CardTitle>
        <CardDescription>{t("app.tagline")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.login.email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.login.password")}</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="totp">{t("auth.login.totp")}</Label>
            <Input id="totp" name="totp" inputMode="numeric" placeholder="------" />
          </div>
          {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {t("auth.login.submit")}
          </Button>
          <div className="flex justify-between text-sm">
            <Link href="/forgot-password" className="text-[var(--primary)] hover:underline">
              {t("auth.login.forgot")}
            </Link>
            <Link href="/register-contractor" className="text-[var(--primary)] hover:underline">
              {t("auth.login.registerContractor")}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
