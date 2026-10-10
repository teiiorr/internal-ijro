import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { IconChevronDown } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationSettings, users } from "@/lib/db/schema";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { DeveloperCard } from "@/components/settings/developer-card";
import { MyContactCardForm } from "@/components/staff/staff-directory/my-contact-card-form";
import { getContactCard } from "@/server/queries/directory";
import { PageHeader } from "@/components/ui-biib/PageHeader";

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
    <div>
      <PageHeader title={t("settings.pageTitle")} />

      <div className="flex min-w-0 max-w-3xl flex-col gap-8 lg:gap-12">
        {/* Profil — kontakt kartasi (o'z Card'ini chizadi) */}
        <MyContactCardForm init={{ ...card, phone: me.phone }} />

        {/* Bildirishnomalar, Xavfsizlik, Til va ko'rinish */}
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

        {/* Ilova haqida — eng pastda, yig'ilgan holda */}
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-2 font-[family-name:var(--font-ui)] text-[1.0625rem] font-bold tracking-tight text-[var(--ink)] sm:text-[1.1875rem]">
            {t("developer.title")}
            <IconChevronDown className="size-5 shrink-0 text-[var(--ink-3)] transition-transform group-[[open]]:rotate-180" aria-hidden />
          </summary>
          <div className="pt-4">
            <DeveloperCard />
          </div>
        </details>
      </div>
    </div>
  );
}
