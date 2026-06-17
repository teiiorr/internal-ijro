"use client";
import { useState, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/server/actions/auth-flow";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
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
    const res = await resetPassword(fd);
    if ("error" in res) setError(t("auth.reset.invalidToken"));
    else router.push("/login");
  }

  return (
    <div className="space-y-8">
      <div className="text-left space-y-3">
        <span className="eyebrow">№ 03 · Reset</span>
        <h1 className="font-bold leading-[0.95] text-[2.5rem] tracking-[-0.035em]">
          {t("auth.reset.title")}<span className="serif-italic">.</span>
        </h1>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.reset.password")}</Label>
          <Input id="password" name="password" type="password" required minLength={8} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t("auth.reset.confirm")}</Label>
          <Input id="confirm" name="confirm" type="password" required minLength={8} />
        </div>
        {error && (
          <div className="rounded-xl bg-[var(--danger-soft)] border-2 border-[var(--danger)] px-4 py-3">
            <p className="text-sm font-bold text-[var(--danger)]">{error}</p>
          </div>
        )}
        <Button type="submit" className="w-full" size="lg">{t("auth.reset.submit")}</Button>
      </form>
    </div>
  );
}
