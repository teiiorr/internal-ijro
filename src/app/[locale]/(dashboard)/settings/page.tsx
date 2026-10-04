import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationSettings, users } from "@/lib/db/schema";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { DeveloperCard } from "@/components/settings/developer-card";
import { MyContactCardForm } from "@/components/staff/staff-directory/my-contact-card-form";
import { getContactCard } from "@/server/queries/directory";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const [u, ns, card] = await Promise.all([
    db.select().from(users).where(eq(users.id, session.user.id)).limit(1),
    db.select().from(notificationSettings).where(eq(notificationSettings.userId, session.user.id)).limit(1),
    getContactCard(session.user.id),
  ]);
  const me = u[0];
  const s = ns[0] ?? {
    inAppEnabled: true, emailEnabled: false,
    notifyTaskAssigned: true, notifyTaskDeadline: true, notifyTaskComment: true,
    notifyMention: true,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("settings.pageTitle")}</h1>
      <DeveloperCard />
      <SettingsTabs
        init={{
          languagePreference: me.languagePreference,
          themePreference: me.themePreference,
          twoFactorEnabled: me.twoFactorEnabled,
          inAppEnabled: s.inAppEnabled,
          emailEnabled: s.emailEnabled,
          notifyTaskAssigned: s.notifyTaskAssigned,
          notifyTaskDeadline: s.notifyTaskDeadline,
          notifyTaskComment: s.notifyTaskComment,
          notifyMention: s.notifyMention,
        }}
      />
      <MyContactCardForm init={{ ...card, phone: me.phone }} />
    </div>
  );
}
