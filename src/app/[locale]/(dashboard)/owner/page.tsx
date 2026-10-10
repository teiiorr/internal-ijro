import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { isOwner, OWNER_TITLE } from "@/lib/permissions/owner";
import { localizeName } from "@/lib/names";
import { formatDateTime } from "@/lib/dates";
import { getSystemStats, getRecentChanges, getSystemInfo, changeKind } from "@/server/queries/owner";
import { listAudit, listStudioActivity } from "@/server/queries/audit";
import { listEmployees } from "@/server/queries/employees";
import { listAllGrants, MANAGED_CAPABILITIES } from "@/lib/permissions/grants";
import { PermissionsManager } from "@/components/owner/permissions-manager";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { FactList } from "@/components/ui-biib/FactList";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { Button } from "@/components/ui-biib/Button";
import { IconDownload, IconCheck, IconX } from "@tabler/icons-react";
import { UserAvatar } from "@/components/ui/user-avatar";

export const dynamic = "force-dynamic";

const money = (n: number) => `${n.toLocaleString("ru-RU")} UZS`;
function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return [d ? `${d}d` : "", h ? `${h}h` : "", `${m}m`].filter(Boolean).join(" ");
}

const CHANGE_TONE: Record<"add" | "delete" | "update", StatusTone> = {
  add: "success",
  delete: "danger",
  update: "warning",
};

export default async function OwnerPage() {
  const user = await requireUser();
  if (!isOwner(user.email)) redirect("/dashboard");
  const t = await getTranslations();
  const locale = await getLocale();

  const [stats, changes, logs, sys, emps, grants, studioActivity] = await Promise.all([
    getSystemStats(),
    getRecentChanges(40),
    listAudit({ scope: "all" }),
    getSystemInfo(),
    listEmployees({ status: "active" }),
    listAllGrants(),
    listStudioActivity(200),
  ]);

  const permCapabilities = MANAGED_CAPABILITIES.map((key) => ({
    key,
    label: t(`owner.permissions.caps.${key.replace(/\./g, "_")}` as "owner.permissions.caps.projects_edit"),
  }));
  const permEmployees = emps.rows.map((e) => ({
    id: e.id,
    fullName: localizeName(e.fullName, locale),
    avatarUrl: e.avatarUrl,
    positionLabel: t(`positions.${e.position}` as "positions.direktor"),
    departmentName: e.departmentName,
  }));

  // Tiles ȯrniga faktlar roʻyxati: quti yoʻq, chapga tekis (A4 — KPI plitkalarsiz).
  const statFacts = [
    { term: t("owner.stats.users"), value: `${stats.users.toLocaleString("ru-RU")} (${stats.activeUsers} ${t("owner.stats.activeSuffix")})` },
    { term: t("owner.stats.projects"), value: `${stats.projects.toLocaleString("ru-RU")} (${stats.activeProjects} ${t("owner.stats.activeSuffix")})` },
    { term: t("owner.stats.tasks"), value: stats.tasks.toLocaleString("ru-RU") },
    { term: t("owner.stats.stages"), value: stats.stages.toLocaleString("ru-RU") },
    { term: t("owner.stats.documents"), value: stats.documents.toLocaleString("ru-RU") },
    { term: t("owner.stats.companies"), value: stats.companies.toLocaleString("ru-RU") },
    { term: t("owner.stats.departments"), value: stats.departments.toLocaleString("ru-RU") },
    { term: t("owner.stats.notifications"), value: stats.notifications.toLocaleString("ru-RU") },
    { term: t("owner.stats.paid"), value: money(stats.paid) },
    { term: t("owner.stats.pending"), value: money(stats.pending) },
  ];

  return (
    <div>
      <PageHeader
        title={t("owner.title")}
        subtitle={`${localizeName(user.fullName, locale)}, ${OWNER_TITLE}`}
      />

      <div className="flex min-w-0 flex-col gap-8 lg:gap-12">
        {/* 1. Holat — tizim koʻrsatkichlari */}
        <Section title={t("owner.statsTitle")}>
          <Card>
            <FactList items={statFacts} />
          </Card>
        </Section>

        {/* 2. Ruxsatlar — har bir xodim uchun huquqlar */}
        <Section title={t("owner.permissions.title")}>
          <p className="mb-4 t-small text-[var(--ink-3)]">{t("owner.permissions.subtitle")}</p>
          <Card solid>
            <PermissionsManager employees={permEmployees} grants={grants} capabilities={permCapabilities} />
          </Card>
        </Section>

        {/* 3. Soʻnggi oʻzgarishlar */}
        <Section title={t("owner.changes.title")}>
          <Card bare className="px-5 sm:px-6">
            {changes.length === 0 ? (
              <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("owner.changes.empty")}</p>
            ) : (
              <Rows>
                {changes.map((c) => {
                  const kind = changeKind(c.action);
                  return (
                    <Row key={c.id}>
                      <Status tone={CHANGE_TONE[kind]} dot className="shrink-0">
                        {t(`owner.changes.${kind}` as "owner.changes.add")}
                      </Status>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {c.userName && <UserAvatar name={c.userName} avatarUrl={c.userAvatarUrl} size="xs" clickable={false} />}
                          <span className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">
                            {c.userName ? localizeName(c.userName, locale) : t("common.emptyValue")}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">
                          <code className="text-[var(--ink-3)]">{c.action}</code>
                          {c.entityType ? `, ${c.entityType}` : ""}
                          {"  "}
                          <span className="tabular-nums">{formatDateTime(c.createdAt as Date, locale)}</span>
                        </p>
                      </div>
                    </Row>
                  );
                })}
              </Rows>
            )}
          </Card>
        </Section>

        {/* 4. Faoliyat jurnali — toʻliq roʻyxat /audit-log sahifasida */}
        <Section
          title={t("owner.logs.title")}
          meta={logs.length > 0 ? <span className="tabular-nums">{logs.length}{stats.logs > logs.length ? ` / ${stats.logs}` : ""}</span> : undefined}
          action={
            <Button asChild variant="glass" size="40" icon={IconDownload}>
              <Link href="/api/export/audit">Excel</Link>
            </Button>
          }
          seeAllHref="/audit-log"
          seeAllLabel={t("common.all")}
        >
          <Card bare className="px-5 sm:px-6">
            {logs.length === 0 ? (
              <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("audit.empty")}</p>
            ) : (
              <Rows>
                {logs.slice(0, 8).map((r) => (
                  <Row key={r.id}>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {r.userName && <UserAvatar name={r.userName} avatarUrl={r.userAvatarUrl} size="xs" clickable={false} />}
                        <span className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">
                          {r.userName ? localizeName(r.userName, locale) : t("common.emptyValue")}
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
                      {formatDateTime(r.createdAt as Date, locale)}
                    </span>
                  </Row>
                ))}
              </Rows>
            )}
          </Card>
        </Section>

        {/* 5. Studiyalar faoliyati */}
        <Section title={t("owner.studioActivity.title")} meta={studioActivity.length > 0 ? <span className="tabular-nums">{studioActivity.length}</span> : undefined}>
          <p className="mb-4 t-small text-[var(--ink-3)]">{t("owner.studioActivity.subtitle")}</p>
          <Card bare className="max-h-[560px] overflow-y-auto px-5 sm:px-6">
            {studioActivity.length === 0 ? (
              <p className="py-6 text-center t-small text-[var(--ink-3)]">{t("owner.studioActivity.empty")}</p>
            ) : (
              <Rows>
                {studioActivity.map((r) => (
                  <Row key={r.id}>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {r.userName && <UserAvatar name={r.userName} avatarUrl={r.userAvatarUrl} size="xs" clickable={false} />}
                        <span className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{r.userName ?? t("common.emptyValue")}</span>
                      </div>
                      <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">
                        {studioActionLabel(t, r.action)}
                        {"  "}
                        <span className="tabular-nums">{formatDateTime(r.createdAt as Date, locale)}</span>
                      </p>
                    </div>
                    <span className="shrink-0 t-micro text-[var(--ink-3)]">{r.ipAddress ?? t("common.emptyValue")}</span>
                  </Row>
                ))}
              </Rows>
            )}
          </Card>
        </Section>

        {/* 6. Dev vositalar va tizim */}
        <Section title={t("owner.system.title")}>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
            {/* Ish muhiti */}
            <Card className="flex flex-col gap-4">
              <h3 className="t-h3 text-[var(--ink)]">{t("owner.system.runtime")}</h3>
              <FactList
                items={[
                  { term: t("owner.system.appVersion"), value: sys.runtime.appVersion },
                  { term: "Node", value: sys.runtime.node },
                  { term: "NODE_ENV", value: sys.runtime.nodeEnv },
                  { term: t("owner.system.uptime"), value: fmtUptime(sys.runtime.uptimeSec) },
                  { term: t("owner.system.platform"), value: sys.runtime.platform },
                  { term: "CPU", value: String(sys.runtime.cpus) },
                  { term: t("owner.system.memory"), value: `${sys.runtime.rssMb}MB / ${sys.runtime.totalMemMb}MB` },
                  { term: "Load avg", value: sys.runtime.loadavg },
                ]}
              />
            </Card>

            {/* Maʼlumotlar bazasi */}
            <Card className="flex flex-col gap-4">
              <h3 className="t-h3 text-[var(--ink)]">{t("owner.system.database")}</h3>
              <FactList
                items={[
                  { term: t("owner.stats.dbSize"), value: stats.dbSize },
                  { term: t("owner.system.connections"), value: String(sys.connections) },
                ]}
              />
              <div className="flex flex-col gap-1.5">
                <p className="t-micro text-[var(--ink-3)]">{t("owner.system.topTables")}</p>
                <ul className="flex flex-col gap-1 t-small">
                  {sys.tables.map((tbl) => (
                    <li key={tbl.name} className="flex items-center justify-between gap-2">
                      <code className="truncate text-[var(--ink-2)]">{tbl.name}</code>
                      <span className="shrink-0 tabular-nums text-[var(--ink)]">{tbl.size}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Zaxira nusxa */}
            <Card className="flex flex-col gap-4">
              <h3 className="t-h3 text-[var(--ink)]">{t("owner.system.backup")}</h3>
              {sys.backup.ok ? (
                sys.backup.latest ? (
                  <FactList
                    items={[
                      { term: t("owner.system.backupLatest"), value: formatDateTime(sys.backup.latest.mtime, locale) },
                      { term: t("owner.system.backupSize"), value: `${sys.backup.latest.sizeMb} MB` },
                      { term: t("owner.system.backupCount"), value: String(sys.backup.count) },
                      { term: t("owner.system.backupTotal"), value: `${sys.backup.totalMb} MB` },
                    ]}
                  />
                ) : (
                  <p className="t-small text-[var(--ink-3)]">{t("owner.system.backupNone")}</p>
                )
              ) : (
                <p className="t-small text-[var(--ink-3)]">{t("owner.system.backupUnavailable")}</p>
              )}
            </Card>

            {/* Muhit */}
            <Card className="flex flex-col gap-4">
              <h3 className="t-h3 text-[var(--ink)]">{t("owner.system.env")}</h3>
              {sys.env.safe.length > 0 && (
                <FactList items={sys.env.safe.map((e) => ({ term: e.k, value: e.v }))} />
              )}
              <div className="flex flex-col gap-1.5">
                <p className="t-micro text-[var(--ink-3)]">{t("owner.system.secrets")}</p>
                <ul className="flex flex-col gap-1 t-small">
                  {sys.env.secret.map((e) => (
                    <li key={e.k} className="flex items-center gap-2">
                      {e.set ? (
                        <IconCheck className="size-4 shrink-0 text-[var(--success)]" aria-hidden />
                      ) : (
                        <IconX className="size-4 shrink-0 text-[var(--danger)]" aria-hidden />
                      )}
                      <code className="truncate text-[var(--ink-2)]">{e.k}</code>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </Section>
      </div>
    </div>
  );
}

// Studiya harakatlarining ȯqiladigan nomlari. Nomaʼlum harakatlar xom kod bȯyicha kȯrsatiladi.
const STUDIO_ACTION_KEYS: Record<string, string> = {
  "auth.login_success": "owner.studioActivity.actions.login",
  "deliverable.submitted": "owner.studioActivity.actions.deliverableSubmitted",
  "task.response_submitted": "owner.studioActivity.actions.taskResponse",
  "stage.document_added": "owner.studioActivity.actions.docAdded",
  "stage.document_removed": "owner.studioActivity.actions.docRemoved",
  "contractor.nda_accepted": "owner.studioActivity.actions.ndaAccepted",
};
function studioActionLabel(t: Awaited<ReturnType<typeof getTranslations>>, action: string): string {
  const key = STUDIO_ACTION_KEYS[action];
  return key ? t(key as "owner.studioActivity.actions.login") : action;
}
