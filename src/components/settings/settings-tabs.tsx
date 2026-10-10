"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Field } from "@/components/ui-biib/Field";
import { Input } from "@/components/ui-biib/Input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
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

export function SettingsTabs({ init }: { init: Init }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const { theme, setTheme } = useTheme();
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const flags: [keyof Init, string][] = [
    ["inAppEnabled", t("settings.notifs.inApp")],
    ["emailEnabled", t("settings.notifs.email")],
    ["notifyTaskAssigned", t("settings.notifs.taskAssigned")],
    ["notifyTaskDeadline", t("settings.notifs.deadline")],
    ["notifyTaskComment", t("settings.notifs.comments")],
    ["notifyMention", t("settings.notifs.mentions")],
  ];

  return (
    <>
      {/* Bildirishnomalar */}
      <Section title={t("settings.tabs.notifications")}>
        <Card bare className="px-5 sm:px-6">
          <Rows>
            {flags.map(([key, label]) => (
              <Row key={String(key)}>
                <span className="min-w-0 flex-1 text-[0.9375rem] text-[var(--ink)]">{label}</span>
                <input
                  type="checkbox"
                  defaultChecked={init[key] as boolean}
                  onChange={(e) => start(async () => { await setNotificationFlags({ [key]: e.target.checked }); })}
                  className="size-5 shrink-0 accent-[var(--tint)]"
                  aria-label={label}
                />
              </Row>
            ))}
          </Rows>
        </Card>
      </Section>

      {/* Xavfsizlik — parol */}
      <Section title={t("settings.security.changePassword")}>
        <Card>
          <form
            className="flex max-w-md flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              start(async () => {
                try {
                  await changePasswordSelf(String(fd.get("current") ?? ""), String(fd.get("next") ?? ""));
                  toast.success(t("settings.security.messages.passwordChanged"));
                  form.reset();
                } catch (err) { toast.error((err as Error).message); }
              });
            }}
          >
            <Field id="pw-current" label={t("settings.security.current")} required>
              {(c) => <Input {...c} name="current" type="password" autoComplete="current-password" />}
            </Field>
            <Field id="pw-next" label={t("settings.security.newPass")} required>
              {(c) => <Input {...c} name="next" type="password" autoComplete="new-password" minLength={8} />}
            </Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>{t("settings.security.change")}</Button>
            </div>
          </form>
        </Card>
      </Section>

      {/* Xavfsizlik — 2FA */}
      <Section title={t("settings.security.twoFa")}>
        <Card>
          {init.twoFactorEnabled ? (
            <div className="flex max-w-md flex-col gap-3">
              <p className="t-small font-medium text-[var(--success)]">{t("settings.security.twoFaEnabled")}</p>
              <form
                className="flex items-start gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const code = (e.currentTarget.elements.namedItem("token") as HTMLInputElement).value;
                  start(async () => { try { await disable2fa(code); toast.success(t("settings.security.messages.twoFaDisabled")); } catch (err) { toast.error((err as Error).message); } });
                }}
              >
                <Input name="token" placeholder={t("settings.security.disablePlaceholder")} aria-label={t("settings.security.disablePlaceholder")} />
                <Button variant="destructive" type="submit" disabled={pending} className="shrink-0">{t("settings.security.disable")}</Button>
              </form>
            </div>
          ) : !qr ? (
            <Button onClick={() => start(async () => { const r = await start2faSetup(); setQr(r.qr); setSecret(r.secret); })} disabled={pending}>
              {t("settings.security.startSetup")}
            </Button>
          ) : (
            <div className="flex max-w-md flex-col gap-3">
              <Image src={qr} alt="2FA QR" width={200} height={200} className="rounded-[var(--radius-m)] border border-[var(--line)]" />
              <p className="t-small text-[var(--ink-3)]">
                {t("settings.security.manualEntry")} <code className="font-mono text-[var(--ink)]">{secret}</code>
              </p>
              <form
                className="flex items-start gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const code = (e.currentTarget.elements.namedItem("token") as HTMLInputElement).value;
                  start(async () => { try { await confirm2fa(code); toast.success(t("settings.security.messages.twoFaEnabled")); } catch (err) { toast.error((err as Error).message); } });
                }}
              >
                <Input name="token" placeholder={t("settings.security.codePlaceholder")} maxLength={6} required aria-label={t("settings.security.codePlaceholder")} />
                <Button type="submit" disabled={pending} className="shrink-0">{t("settings.security.verify")}</Button>
              </form>
            </div>
          )}
        </Card>
      </Section>

      {/* Til va ko'rinish */}
      <Section title={t("settings.tabs.personal")}>
        <Card>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pref-language">{t("settings.personal.language")}</Label>
              <Select
                defaultValue={init.languagePreference}
                onValueChange={(v) => start(async () => { await updateProfilePreferences({ languagePreference: v }); })}
              >
                <SelectTrigger id="pref-language"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="uz-latn">{t("settings.lang.uz-latn")}</SelectItem>
                  <SelectItem value="uz-cyrl">{t("settings.lang.uz-cyrl")}</SelectItem>
                  <SelectItem value="oz">{t("settings.lang.oz")}</SelectItem>
                  <SelectItem value="ru">{t("settings.lang.ru")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pref-theme">{t("settings.personal.theme")}</Label>
              <Select
                value={theme}
                onValueChange={(v) => {
                  setTheme(v as "light" | "dark" | "system");
                  start(async () => { await updateProfilePreferences({ themePreference: v }); });
                }}
              >
                <SelectTrigger id="pref-theme"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("settings.theme.light")}</SelectItem>
                  <SelectItem value="dark">{t("settings.theme.dark")}</SelectItem>
                  <SelectItem value="system">{t("settings.theme.system")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </Section>
    </>
  );
}
