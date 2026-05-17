"use client";
import { useState, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptInvitation } from "@/server/actions/auth-flow";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (fd.get("password") !== fd.get("confirm")) {
      setError(t("auth.reset.mismatch"));
      return;
    }
    fd.set("token", token);
    const res = await acceptInvitation(fd);
    if ("error" in res) setError(t("auth.invite.invalid"));
    else router.push("/login");
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t("auth.invite.title")}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">{t("auth.invite.fullName")}</Label>
            <Input id="fullName" name="fullName" required minLength={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.invite.password")}</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">{t("auth.invite.confirm")}</Label>
            <Input id="confirm" name="confirm" type="password" required minLength={8} />
          </div>
          {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
          <Button type="submit" className="w-full">{t("auth.invite.submit")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
