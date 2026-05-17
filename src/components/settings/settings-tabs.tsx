"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  changePasswordSelf,
  confirm2fa,
  disable2fa,
  disconnectTelegram,
  generateTelegramLinkingCode,
  setNotificationFlags,
  start2faSetup,
  updateProfilePreferences,
} from "@/server/actions/settings";

type Init = {
  languagePreference: string;
  themePreference: string;
  timezone: string;
  twoFactorEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  telegramEnabled: boolean;
  telegramChatId: string | null;
  notifyTaskAssigned: boolean;
  notifyTaskDeadline: boolean;
  notifyTaskComment: boolean;
  notifyMention: boolean;
  notifyStandupReminder: boolean;
};

export function SettingsTabs({ init }: { init: Init }) {
  const [pending, start] = useTransition();
  const [tgCode, setTgCode] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <Tabs defaultValue="personal">
      <TabsList>
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="telegram">Telegram</TabsTrigger>
      </TabsList>

      <TabsContent value="personal">
        <Card><CardContent className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select defaultValue={init.languagePreference} onValueChange={(v) => start(async () => { await updateProfilePreferences({ languagePreference: v }); })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="uz-latn">O&apos;zbek (latin)</SelectItem>
                  <SelectItem value="uz-cyrl">Ўзбек (cyrillic)</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Theme</Label>
              <Select defaultValue={init.themePreference} onValueChange={(v) => start(async () => { await updateProfilePreferences({ themePreference: v }); })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input
                defaultValue={init.timezone}
                onBlur={(e) => start(async () => { await updateProfilePreferences({ timezone: e.target.value }); })}
              />
            </div>
          </div>
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="notifications">
        <Card><CardContent className="p-6 space-y-3">
          {[
            ["inAppEnabled", "In-app notifications"],
            ["emailEnabled", "Email"],
            ["notifyTaskAssigned", "Task assigned"],
            ["notifyTaskDeadline", "Deadline approaching"],
            ["notifyTaskComment", "New comments"],
            ["notifyMention", "Mentions"],
            ["notifyStandupReminder", "Standup reminder"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between text-sm">
              <span>{label}</span>
              <input
                type="checkbox"
                defaultChecked={(init as unknown as Record<string, boolean>)[key]}
                onChange={(e) => start(async () => { await setNotificationFlags({ [key]: e.target.checked }); })}
              />
            </label>
          ))}
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="security">
        <Card>
          <CardHeader><CardTitle className="text-lg">Change password</CardTitle></CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                start(async () => {
                  try {
                    await changePasswordSelf(String(fd.get("current") ?? ""), String(fd.get("next") ?? ""));
                    setMsg("Password changed");
                  } catch (err) { setMsg((err as Error).message); }
                });
              }}
            >
              <Input name="current" type="password" placeholder="Current password" required />
              <Input name="next" type="password" placeholder="New password (min 8)" required minLength={8} />
              <Button type="submit" disabled={pending}>Change</Button>
              {msg && <p className="text-sm">{msg}</p>}
            </form>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader><CardTitle className="text-lg">Two-factor authentication</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {init.twoFactorEnabled ? (
              <>
                <p className="text-sm text-[var(--success)]">2FA is enabled.</p>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const code = (e.currentTarget.elements.namedItem("token") as HTMLInputElement).value;
                    start(async () => { try { await disable2fa(code); setMsg("2FA disabled"); } catch (err) { setMsg((err as Error).message); } });
                  }}
                >
                  <Input name="token" placeholder="Enter current 6-digit code to disable" />
                  <Button variant="destructive" type="submit" disabled={pending}>Disable</Button>
                </form>
              </>
            ) : (
              <>
                {!qr ? (
                  <Button onClick={() => start(async () => { const r = await start2faSetup(); setQr(r.qr); setSecret(r.secret); })} disabled={pending}>Start setup</Button>
                ) : (
                  <div className="space-y-2">
                    <Image src={qr} alt="2FA QR" width={180} height={180} />
                    <p className="text-xs text-[var(--muted)]">Or enter secret manually: <code>{secret}</code></p>
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const code = (e.currentTarget.elements.namedItem("token") as HTMLInputElement).value;
                        start(async () => { try { await confirm2fa(code); setMsg("2FA enabled"); } catch (err) { setMsg((err as Error).message); } });
                      }}
                    >
                      <Input name="token" placeholder="6-digit code" maxLength={6} required />
                      <Button type="submit" disabled={pending}>Verify</Button>
                    </form>
                  </div>
                )}
              </>
            )}
            {msg && <p className="text-sm">{msg}</p>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="telegram">
        <Card><CardContent className="p-6 space-y-3 text-sm">
          {init.telegramChatId && !init.telegramChatId.startsWith("pending:") ? (
            <>
              <p>Connected.</p>
              <Button variant="destructive" disabled={pending} onClick={() => start(async () => { await disconnectTelegram(); })}>Disconnect</Button>
            </>
          ) : (
            <>
              <p>To connect: generate a code below, then send it to the bot in Telegram.</p>
              <Button disabled={pending} onClick={() => start(async () => { const r = await generateTelegramLinkingCode(); setTgCode(r.code); })}>
                Generate code
              </Button>
              {tgCode && <p>Your code: <code className="text-lg font-mono">{tgCode}</code></p>}
            </>
          )}
        </CardContent></Card>
      </TabsContent>
    </Tabs>
  );
}
