"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  changePasswordSelf,
  confirm2fa,
  disable2fa,
  setNotificationFlags,
  start2faSetup,
  updateProfilePreferences,
} from "@/server/actions/settings";

type Init = {
  languagePreference: string;
  themePreference: string;
  twoFactorEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  notifyTaskAssigned: boolean;
  notifyTaskDeadline: boolean;
  notifyTaskComment: boolean;
  notifyMention: boolean;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-7">
      <h2 className="text-lg font-bold tracking-tight mb-5">{title}</h2>
      {children}
    </Card>
  );
}

export function SettingsTabs({ init }: { init: Init }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const flags: [keyof Init, string][] = [
    ["inAppEnabled", t("settings.notifs.inApp")],
    ["emailEnabled", t("settings.notifs.email")],
    ["notifyTaskAssigned", t("settings.notifs.taskAssigned")],
    ["notifyTaskDeadline", t("settings.notifs.deadline")],
    ["notifyTaskComment", t("settings.notifs.comments")],
    ["notifyMention", t("settings.notifs.mentions")],
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <Section title={t("settings.tabs.personal")}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("settings.personal.language")}</Label>
            <Select defaultValue={init.languagePreference} onValueChange={(v) => start(async () => { await updateProfilePreferences({ languagePreference: v }); })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="uz-latn">{t("settings.lang.uz-latn")}</SelectItem>
                <SelectItem value="uz-cyrl">{t("settings.lang.uz-cyrl")}</SelectItem>
                <SelectItem value="ru">{t("settings.lang.ru")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section title={t("settings.tabs.notifications")}>
        <div className="space-y-3.5">
          {flags.map(([key, label]) => (
            <label key={String(key)} className="flex items-center justify-between text-[15px] py-1">
              <span>{label}</span>
              <input
                type="checkbox"
                defaultChecked={init[key] as boolean}
                onChange={(e) => start(async () => { await setNotificationFlags({ [key]: e.target.checked }); })}
                className="size-5"
              />
            </label>
          ))}
        </div>
      </Section>

      <Section title={t("settings.security.changePassword")}>
        <form
          className="space-y-3 max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              try {
                await changePasswordSelf(String(fd.get("current") ?? ""), String(fd.get("next") ?? ""));
                setMsg(t("settings.security.messages.passwordChanged"));
                (e.target as HTMLFormElement).reset();
              } catch (err) { setMsg((err as Error).message); }
            });
          }}
        >
          <Input name="current" type="password" placeholder={t("settings.security.current")} required />
          <Input name="next" type="password" placeholder={t("settings.security.newPass")} required minLength={8} />
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>{t("settings.security.change")}</Button>
          </div>
          {msg && <p className="text-sm text-[var(--muted)]">{msg}</p>}
        </form>
      </Section>

      <Section title={t("settings.security.twoFa")}>
        {init.twoFactorEnabled ? (
          <div className="space-y-3 max-w-md">
            <p className="text-sm text-[var(--success)] font-medium">{t("settings.security.twoFaEnabled")}</p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const code = (e.currentTarget.elements.namedItem("token") as HTMLInputElement).value;
                start(async () => { try { await disable2fa(code); setMsg(t("settings.security.messages.twoFaDisabled")); } catch (err) { setMsg((err as Error).message); } });
              }}
            >
              <Input name="token" placeholder={t("settings.security.disablePlaceholder")} />
              <Button variant="destructive" type="submit" disabled={pending}>{t("settings.security.disable")}</Button>
            </form>
          </div>
        ) : !qr ? (
          <Button onClick={() => start(async () => { const r = await start2faSetup(); setQr(r.qr); setSecret(r.secret); })} disabled={pending}>
            {t("settings.security.startSetup")}
          </Button>
        ) : (
          <div className="space-y-3 max-w-md">
            <Image src={qr} alt="2FA QR" width={200} height={200} className="rounded-lg border" />
            <p className="text-xs text-[var(--muted)]">{t("settings.security.manualEntry")} <code className="font-mono text-[var(--foreground)]">{secret}</code></p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const code = (e.currentTarget.elements.namedItem("token") as HTMLInputElement).value;
                start(async () => { try { await confirm2fa(code); setMsg(t("settings.security.messages.twoFaEnabled")); } catch (err) { setMsg((err as Error).message); } });
              }}
            >
              <Input name="token" placeholder={t("settings.security.codePlaceholder")} maxLength={6} required />
              <Button type="submit" disabled={pending}>{t("settings.security.verify")}</Button>
            </form>
          </div>
        )}
      </Section>
    </div>
  );
}
