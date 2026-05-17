import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationSettings, users } from "@/lib/db/schema";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const [u, ns] = await Promise.all([
    db.select().from(users).where(eq(users.id, session.user.id)).limit(1),
    db.select().from(notificationSettings).where(eq(notificationSettings.userId, session.user.id)).limit(1),
  ]);
  const me = u[0];
  const s = ns[0] ?? {
    inAppEnabled: true, emailEnabled: true, telegramEnabled: false, telegramChatId: null,
    notifyTaskAssigned: true, notifyTaskDeadline: true, notifyTaskComment: true,
    notifyMention: true, notifyStandupReminder: true,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsTabs
        init={{
          languagePreference: me.languagePreference,
          themePreference: me.themePreference,
          timezone: me.timezone,
          twoFactorEnabled: me.twoFactorEnabled,
          inAppEnabled: s.inAppEnabled,
          emailEnabled: s.emailEnabled,
          telegramEnabled: s.telegramEnabled,
          telegramChatId: s.telegramChatId,
          notifyTaskAssigned: s.notifyTaskAssigned,
          notifyTaskDeadline: s.notifyTaskDeadline,
          notifyTaskComment: s.notifyTaskComment,
          notifyMention: s.notifyMention,
          notifyStandupReminder: s.notifyStandupReminder,
        }}
      />
    </div>
  );
}
