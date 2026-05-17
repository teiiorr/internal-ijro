import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markAllRead } from "@/server/actions/notifications";
import { CheckCheck } from "lucide-react";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(200);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("notifications.pageTitle")}</h1>
        <form action={markAllRead}>
          <Button type="submit" variant="outline" size="sm"><CheckCheck className="size-4" /> {t("notifications.markAllRead")}</Button>
        </form>
      </div>

      <div className="space-y-2">
        {rows.map((n) => (
          <Card key={n.id} className={n.isRead ? "opacity-70" : ""}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {!n.isRead && <Badge variant="default" className="h-2 w-2 p-0" />}
                    <h3 className="font-medium">{n.title}</h3>
                  </div>
                  {n.message && <p className="text-sm text-[var(--muted)] mt-1">{n.message}</p>}
                  {n.link && (
                    <Link href={n.link} className="text-sm text-[var(--primary)] hover:underline mt-1 inline-block">
                      {t("notifications.open")} →
                    </Link>
                  )}
                </div>
                <span className="text-xs text-[var(--muted)]">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card><CardContent className="p-10 text-center text-[var(--muted)]">{t("notifications.empty")}</CardContent></Card>
        )}
      </div>
    </div>
  );
}
