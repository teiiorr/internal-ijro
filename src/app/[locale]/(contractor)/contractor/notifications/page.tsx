import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { desc, eq } from "drizzle-orm";
import { IconChecks as CheckCheck } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { Card } from "@/components/ui-biib/Card";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Button } from "@/components/ui-biib/Button";
import { markAllRead } from "@/server/actions/notifications";
import { formatDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Studiya bildirishnomalari — joriy foydalanuvchining bildirishnomalari. Faqat qoʻngʻiroqdan
// ochiladi; butun qator havola (server amallar qabul qiluvchiga mos).
export default async function ContractorNotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(200);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t("notifications.pageTitle")}
        actions={
          <form action={markAllRead}>
            <Button type="submit" variant="glass" size="40" icon={CheckCheck}>{t("notifications.markAllRead")}</Button>
          </form>
        }
      />
      <Card bare className="px-5 sm:px-6">
        {rows.length === 0 ? (
          <p className="py-10 text-center t-small text-[var(--ink-3)]">{t("notifications.empty")}</p>
        ) : (
          <Rows>
            {rows.map((n) => (
              <Row key={n.id} href={n.link ?? undefined}>
                {!n.isRead && <span className="mt-1.5 size-2 shrink-0 self-start rounded-full bg-[var(--tint)]" aria-hidden />}
                <div className="min-w-0 flex-1">
                  <p className={n.isRead ? "truncate text-[0.9375rem] font-medium text-[var(--ink-2)]" : "truncate text-[0.9375rem] font-bold text-[var(--ink)]"}>
                    {n.title}
                  </p>
                  {n.message && <p className="mt-0.5 line-clamp-2 t-small text-[var(--ink-3)]">{n.message}</p>}
                </div>
                <span className="shrink-0 whitespace-nowrap t-micro tabular-nums text-[var(--ink-3)]">{formatDateTime(n.createdAt, locale)}</span>
              </Row>
            ))}
          </Rows>
        )}
      </Card>
    </div>
  );
}
