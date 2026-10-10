import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { IconDownload } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { listAudit } from "@/server/queries/audit";
import { formatDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { Button } from "@/components/ui-biib/Button";
import { UserAvatar } from "@/components/ui/user-avatar";

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const me = session.user;
  if (!["direktor", "orinbosar", "hr"].includes(me.position)) redirect("/dashboard");

  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const rows = await listAudit({
    userId: get("userId") ?? null,
    action: get("action") ?? null,
    entityType: get("entityType") ?? null,
    from: get("from") ?? null,
    to: get("to") ?? null,
    search: get("q") ?? null,
    scope: me.position === "hr" ? "hr" : "all",
  });

  const exportQuery = new URLSearchParams(
    Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]),
  ).toString();

  return (
    <div>
      <PageHeader
        title={t("audit.pageTitle")}
        subtitle={rows.length > 0 ? <span className="tabular-nums">{rows.length}</span> : undefined}
        actions={
          <Button asChild variant="glass" icon={IconDownload}>
            <Link href={`/api/export/audit${exportQuery ? `?${exportQuery}` : ""}`}>Excel</Link>
          </Button>
        }
      />

      <Card bare className="px-5 sm:px-6">
        {rows.length === 0 ? (
          <p className="py-10 text-center t-small text-[var(--ink-3)]">{t("audit.empty")}</p>
        ) : (
          <Rows>
            {rows.map((r) => (
              <Row key={r.id}>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {r.userName && <UserAvatar name={r.userName} avatarUrl={r.userAvatarUrl} size="xs" clickable={false} />}
                    <span className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">
                      {r.userName ?? t("common.emptyValue")}
                    </span>
                    <code className="shrink-0 t-micro text-[var(--ink-3)]">{r.action}</code>
                  </div>
                  <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">
                    {r.entityType ?? t("common.emptyValue")}
                    {r.entityId ? ` ${r.entityId.slice(0, 8)}` : ""}
                    {r.ipAddress ? `  ${r.ipAddress}` : ""}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums t-micro text-[var(--ink-3)]">
                  {formatDateTime(r.createdAt, locale)}
                </span>
              </Row>
            ))}
          </Rows>
        )}
      </Card>
    </div>
  );
}
