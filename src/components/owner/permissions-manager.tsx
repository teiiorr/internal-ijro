"use client";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconSearch as Search, IconCheck as Check } from "@tabler/icons-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setUserPermission } from "@/server/actions/permissions";
import { cn } from "@/lib/utils";

type Emp = {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  positionLabel: string;
  departmentName?: string | null;
};
type Cap = { key: string; label: string };

export function PermissionsManager({
  employees,
  grants: initialGrants,
  capabilities,
}: {
  employees: Emp[];
  grants: Record<string, string[]>;
  capabilities: Cap[];
}) {
  const t = useTranslations();
  const [grants, setGrants] = useState<Record<string, string[]>>(initialGrants);
  const [, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.fullName.toLowerCase().includes(q));
  }, [employees, search]);

  function toggle(userId: string, cap: string, on: boolean) {
    const key = `${userId}:${cap}`;
    setBusy(key);
    setGrants((prev) => {
      const set = new Set(prev[userId] ?? []);
      if (on) set.delete(cap);
      else set.add(cap);
      return { ...prev, [userId]: [...set] };
    });
    start(async () => {
      try {
        await setUserPermission(userId, cap, !on);
      } catch {
        toast.error(t("common.error"));
        setGrants((prev) => {
          const set = new Set(prev[userId] ?? []);
          if (on) set.add(cap);
          else set.delete(cap);
          return { ...prev, [userId]: [...set] };
        });
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-3)]" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.search")}
          className="h-11 w-full rounded-[var(--radius-m)] border border-[var(--line-strong)] bg-[var(--surface-2)] pl-10 pr-3 t-body text-[var(--ink)] placeholder:text-[var(--ink-3)] focus-visible:border-[var(--tint)] focus-visible:outline-none"
        />
      </div>

      {/* Huquqlar matritsasi: xodimlar × imkoniyatlar — mobil qurilmada gorizontal skroll. */}
      <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">{t("owner.stats.users")}</TableHead>
            {capabilities.map((c) => (
              <TableHead key={c.key} className="whitespace-nowrap text-center">{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <UserAvatar name={e.fullName} avatarUrl={e.avatarUrl} size="xs" clickable={false} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{e.fullName}</p>
                    <p className="truncate text-xs text-[var(--ink-3)]">
                      {[e.positionLabel, e.departmentName].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
              </TableCell>
              {capabilities.map((c) => {
                const on = (grants[e.id] ?? []).includes(c.key);
                const key = `${e.id}:${c.key}`;
                return (
                  <TableCell key={c.key} className="text-center">
                    <button
                      type="button"
                      disabled={busy === key}
                      onClick={() => toggle(e.id, c.key, on)}
                      aria-pressed={on}
                      aria-label={c.label}
                      className={cn(
                        "inline-grid size-7 place-items-center rounded-[var(--radius-s)] transition-[background-color,border-color] duration-[var(--dur-ui)] ease-[var(--ease-ui)] disabled:opacity-50",
                        on
                          ? "bg-[var(--tint)] text-[var(--on-tint)]"
                          : "border border-[var(--line)] bg-[var(--surface-2)] text-transparent hover:border-[var(--line-strong)]",
                      )}
                    >
                      <Check className="size-4" strokeWidth={3} />
                    </button>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={capabilities.length + 1} className="py-8 text-center text-sm text-[var(--ink-3)]">
                {t("common.noResults")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
