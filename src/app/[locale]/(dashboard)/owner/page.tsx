import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { isOwner, OWNER_TITLE } from "@/lib/permissions/owner";
import { localizeName } from "@/lib/names";
import { formatDateTime } from "@/lib/dates";
import { getSystemStats, getRecentChanges, getSystemInfo, changeKind } from "@/server/queries/owner";
import { listAudit } from "@/server/queries/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FitText } from "@/components/ui/fit-text";
import { IconShieldCheck as ShieldCheck, IconDownload as Download, IconCirclePlus as PlusCircle, IconTrash as Trash2, IconPencil as Pencil, IconDatabase as Database, IconServer as Server, IconDatabaseExport as HardDriveDownload, IconKey as KeyRound } from "@tabler/icons-react";
import { UserAvatar } from "@/components/ui/user-avatar";

export const dynamic = "force-dynamic";

const money = (n: number) => `${n.toLocaleString("ru-RU")} UZS`;
function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return [d ? `${d}d` : "", h ? `${h}h` : "", `${m}m`].filter(Boolean).join(" ");
}

export default async function OwnerPage() {
  const user = await requireUser();
  if (!isOwner(user.email)) redirect("/dashboard");
  const t = await getTranslations();
  const locale = await getLocale();

  const [stats, changes, logs, sys] = await Promise.all([
    getSystemStats(),
    getRecentChanges(40),
    listAudit({ scope: "all" }),
    getSystemInfo(),
  ]);

  // Count tiles — small numbers, fit the narrow grid cells.
  const tiles: { label: string; value: string | number; sub?: string }[] = [
    { label: t("owner.stats.users"), value: stats.users, sub: `${stats.activeUsers} ${t("owner.stats.activeSuffix")}` },
    { label: t("owner.stats.projects"), value: stats.projects, sub: `${stats.activeProjects} ${t("owner.stats.activeSuffix")}` },
    { label: t("owner.stats.tasks"), value: stats.tasks },
    { label: t("owner.stats.stages"), value: stats.stages },
    { label: t("owner.stats.documents"), value: stats.documents },
    { label: t("owner.stats.companies"), value: stats.companies },
    { label: t("owner.stats.departments"), value: stats.departments },
    { label: t("owner.stats.notifications"), value: stats.notifications },
    { label: t("owner.stats.logs"), value: stats.logs },
    { label: t("owner.stats.dbSize"), value: stats.dbSize },
    { label: t("owner.stats.connections"), value: sys.connections },
  ];
  // Money tiles — big sums; rendered last as full-width cards so the whole
  // figure fits on one line instead of wrapping in a narrow cell.
  const moneyTiles: { label: string; value: string }[] = [
    { label: t("owner.stats.paid"), value: money(stats.paid) },
    { label: t("owner.stats.pending"), value: money(stats.pending) },
  ];

  const kindMeta = {
    add: { label: t("owner.changes.add"), cls: "text-[var(--success)] bg-[var(--success)]/12", icon: <PlusCircle className="size-3.5" /> },
    delete: { label: t("owner.changes.delete"), cls: "text-[var(--danger)] bg-[var(--danger)]/12", icon: <Trash2 className="size-3.5" /> },
    update: { label: t("owner.changes.update"), cls: "text-[var(--warning)] bg-[var(--warning)]/12", icon: <Pencil className="size-3.5" /> },
  } as const;

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--primary)] text-white shadow-[var(--shadow-2)]">
          <ShieldCheck className="size-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("owner.title")}</h1>
          <p className="text-[var(--muted)] mt-1 text-sm font-medium">
            {localizeName(user.fullName, locale)} <span className="godfather-title align-middle text-lg sm:text-xl">{OWNER_TITLE}</span>
          </p>
        </div>
      </div>

      {/* 1. System statistics */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("owner.statsTitle")}</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {tiles.map((tile) => (
            <Card key={tile.label}>
              <CardContent className="p-4 text-center">
                <p className="text-xs font-semibold text-[var(--muted)] leading-tight">{tile.label}</p>
                <p className="text-2xl font-bold tabular-nums mt-1.5 break-words">{tile.value}</p>
                {tile.sub && <p className="text-xs text-[var(--muted)] mt-0.5">{tile.sub}</p>}
              </CardContent>
            </Card>
          ))}
          {/* Money tiles last, stretched full width — the sum fits on one line
              (font shrinks to fit rather than wrapping). */}
          {moneyTiles.map((tile) => (
            <Card key={tile.label} className="col-span-full">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <p className="shrink-0 text-xs font-semibold text-[var(--muted)] leading-tight">{tile.label}</p>
                <div className="min-w-0 flex-1 text-right">
                  <FitText className="font-bold tabular-nums" maxPx={26} minPx={15}>{tile.value}</FitText>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 2. Recent changes — who added / deleted / changed */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("owner.changes.title")}</h2>
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-[var(--border)]">
              {changes.length === 0 && <li className="p-5 text-sm text-[var(--muted)]">{t("owner.changes.empty")}</li>}
              {changes.map((c) => {
                const meta = kindMeta[changeKind(c.action)];
                return (
                  <li key={c.id} className="flex items-start gap-2.5 px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shrink-0 ${meta.cls}`}>
                      {meta.icon}<span className="hidden min-[420px]:inline">{meta.label}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {c.userName && <UserAvatar name={c.userName} avatarUrl={c.userAvatarUrl} size="xs" clickable={false} />}
                        <span className="truncate text-sm font-medium">{c.userName ? localizeName(c.userName, locale) : "—"}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                        <code className="text-[var(--muted)]">{c.action}</code>
                        {c.entityType ? ` · ${c.entityType}` : ""}
                        <span className="mx-1 opacity-50">·</span>
                        <span className="tabular-nums">{formatDateTime(c.createdAt as Date, locale)}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* 3. All logs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-semibold">
              {t("owner.logs.title")}{" "}
              <span className="text-[var(--muted)] font-normal tabular-nums">({logs.length}{stats.logs > logs.length ? ` / ${stats.logs}` : ""})</span>
            </h2>
            {stats.logs > logs.length && <p className="text-xs text-[var(--muted)] mt-0.5">{t("owner.logs.latest")}</p>}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/api/export/audit"><Download className="size-4" /> Excel</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0 max-h-[560px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("audit.table.time")}</TableHead>
                  <TableHead>{t("audit.table.user")}</TableHead>
                  <TableHead>{t("audit.table.action")}</TableHead>
                  <TableHead>{t("audit.table.entity")}</TableHead>
                  <TableHead>{t("audit.table.ip")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-[var(--muted)] py-8">{t("audit.empty")}</TableCell></TableRow>
                )}
                {logs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs tabular-nums whitespace-nowrap">{formatDateTime(r.createdAt as Date, locale)}</TableCell>
                    <TableCell className="text-sm"><span className="inline-flex items-center gap-1.5">{r.userName && <UserAvatar name={r.userName} avatarUrl={r.userAvatarUrl} size="xs" clickable={false} />}{r.userName ? localizeName(r.userName, locale) : "—"}</span></TableCell>
                    <TableCell><code className="text-xs">{r.action}</code></TableCell>
                    <TableCell className="text-xs text-[var(--muted)]">{r.entityType ?? "—"}{r.entityId ? ` ${r.entityId.slice(0, 8)}` : ""}</TableCell>
                    <TableCell className="text-xs text-[var(--muted)]">{r.ipAddress ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* 4. Dev tools / system info */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("owner.system.title")}</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Runtime */}
          <Card>
            <CardContent className="p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold"><Server className="size-4 text-[var(--muted)]" />{t("owner.system.runtime")}</div>
              <dl className="detail-grid grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 sm:gap-x-4 sm:gap-y-1.5 text-sm">
                <InfoRow k={t("owner.system.appVersion")} v={sys.runtime.appVersion} />
                <InfoRow k="Node" v={sys.runtime.node} />
                <InfoRow k="NODE_ENV" v={sys.runtime.nodeEnv} />
                <InfoRow k={t("owner.system.uptime")} v={fmtUptime(sys.runtime.uptimeSec)} />
                <InfoRow k={t("owner.system.platform")} v={sys.runtime.platform} />
                <InfoRow k="CPU" v={String(sys.runtime.cpus)} />
                <InfoRow k={t("owner.system.memory")} v={`${sys.runtime.rssMb}MB / ${sys.runtime.totalMemMb}MB`} />
                <InfoRow k="Load avg" v={sys.runtime.loadavg} />
              </dl>
            </CardContent>
          </Card>

          {/* Database */}
          <Card>
            <CardContent className="p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold"><Database className="size-4 text-[var(--muted)]" />{t("owner.system.database")}</div>
              <dl className="detail-grid grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 sm:gap-x-4 sm:gap-y-1.5 text-sm">
                <InfoRow k={t("owner.stats.dbSize")} v={stats.dbSize} />
                <InfoRow k={t("owner.system.connections")} v={String(sys.connections)} />
              </dl>
              <div className="pt-1">
                <p className="text-xs font-semibold text-[var(--muted)] mb-1.5">{t("owner.system.topTables")}</p>
                <ul className="space-y-1 text-xs">
                  {sys.tables.map((tbl) => (
                    <li key={tbl.name} className="flex items-center justify-between gap-2">
                      <code className="text-[var(--muted)] truncate">{tbl.name}</code>
                      <span className="tabular-nums shrink-0">{tbl.size}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Backup */}
          <Card>
            <CardContent className="p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold"><HardDriveDownload className="size-4 text-[var(--muted)]" />{t("owner.system.backup")}</div>
              {sys.backup.ok ? (
                sys.backup.latest ? (
                  <dl className="detail-grid grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 sm:gap-x-4 sm:gap-y-1.5 text-sm">
                    <InfoRow k={t("owner.system.backupLatest")} v={formatDateTime(sys.backup.latest.mtime, locale)} />
                    <InfoRow k={t("owner.system.backupSize")} v={`${sys.backup.latest.sizeMb} MB`} />
                    <InfoRow k={t("owner.system.backupCount")} v={String(sys.backup.count)} />
                    <InfoRow k={t("owner.system.backupTotal")} v={`${sys.backup.totalMb} MB`} />
                  </dl>
                ) : (
                  <p className="text-sm text-[var(--muted)]">{t("owner.system.backupNone")}</p>
                )
              ) : (
                <p className="text-sm text-[var(--muted)]">{t("owner.system.backupUnavailable")}</p>
              )}
            </CardContent>
          </Card>

          {/* Environment */}
          <Card>
            <CardContent className="p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4 text-[var(--muted)]" />{t("owner.system.env")}</div>
              <dl className="detail-grid grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 sm:gap-x-4 sm:gap-y-1.5 text-sm">
                {sys.env.safe.map((e) => <InfoRow key={e.k} k={e.k} v={e.v} />)}
              </dl>
              <div className="pt-1">
                <p className="text-xs font-semibold text-[var(--muted)] mb-1.5">{t("owner.system.secrets")}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {sys.env.secret.map((e) => (
                    <li key={e.k} className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.set ? "bg-[var(--success)]/12 text-[var(--success)]" : "bg-[var(--danger)]/12 text-[var(--danger)]"}`}>
                      {e.k} {e.set ? "✓" : "✗"}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[var(--muted)]">{k}</dt>
      <dd className="font-medium truncate" title={v}>{v}</dd>
    </div>
  );
}
