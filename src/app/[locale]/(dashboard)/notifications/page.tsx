import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { desc, eq } from "drizzle-orm";
import { IconChecks, IconBell } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Button } from "@/components/ui-biib/Button";
import { EmptyState } from "@/components/empty-state";
import { markAllRead } from "@/server/actions/notifications";
import { formatDate } from "@/lib/dates";
import { addDays, todayTashkent } from "@/lib/my-work/buckets";
import { cn } from "@/lib/utils";

type Notification = typeof notifications.$inferSelect;

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations("notifications");
  const tc = await getTranslations("common");
  const locale = await getLocale();

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(200);

  const today = todayTashkent();
  const yesterday = addDays(today, -1);
  const year = today.slice(0, 4);

  // Toshkent kalendar kuni boʻyicha guruhlash (roʻyxat allaqachon vaqt boʻyicha kamayib boradi).
  const groups: { day: string; items: Notification[] }[] = [];
  for (const n of rows) {
    const day = todayTashkent(new Date(n.createdAt));
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(n);
    else groups.push({ day, items: [n] });
  }

  const dayLabel = (day: string) => {
    if (day === today) return tc("today");
    if (day === yesterday) return tc("yesterday");
    const full = formatDate(`${day}T12:00:00+05:00`, locale);
    return day.startsWith(year) ? full.replace(/\s\d{4}$/, "") : full;
  };

  const hhmm = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tashkent",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);

  return (
    <div>
      <PageHeader
        title={t("pageTitle")}
        actions={
          rows.length > 0 ? (
            <form action={markAllRead}>
              <Button type="submit" variant="glass" icon={IconChecks}>
                {t("markAllRead")}
              </Button>
            </form>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={IconBell} title={t("empty")} />
        </Card>
      ) : (
        <div className="flex min-w-0 flex-col gap-8 lg:gap-12">
          {groups.map(({ day, items }) => (
            <Section key={day} title={dayLabel(day)}>
              <Card bare className="px-5 sm:px-6">
                <Rows>
                  {items.map((n) => (
                    <Row key={n.id} href={n.link ?? undefined} className="items-start">
                      <span className="mt-1.5 flex size-2 shrink-0 items-center justify-center">
                        {!n.isRead && (
                          <span className="size-2 rounded-full bg-[var(--tint)]" aria-hidden />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span
                            className={cn(
                              "min-w-0 break-words text-[0.9375rem] font-medium",
                              n.isRead ? "text-[var(--ink-2)]" : "text-[var(--ink)]",
                            )}
                          >
                            {n.title}
                          </span>
                          <time className="shrink-0 t-micro tabular-nums text-[var(--ink-3)]">{hhmm(n.createdAt)}</time>
                        </div>
                        {n.message && (
                          <p className="mt-0.5 line-clamp-2 t-small text-[var(--ink-2)]">{n.message}</p>
                        )}
                      </div>
                    </Row>
                  ))}
                </Rows>
              </Card>
            </Section>
          ))}
        </div>
      )}
    </div>
  );
}
