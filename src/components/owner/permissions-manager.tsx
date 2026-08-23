"use client";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconSearch as Search, IconCheck as Check } from "@tabler/icons-react";
import { UserAvatar } from "@/components/ui/user-avatar";
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
    // optimistic
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
        // revert
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
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--subtle)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.search")}
          className="h-10 w-full rounded-xl border border-[var(--input)] bg-[var(--surface-1)] pl-10 pr-3 text-sm focus-visible:border-[var(--primary)] focus-visible:outline-none"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((e) => (
          <div key={e.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5">
            <div className="flex items-center gap-2.5">
              <UserAvatar name={e.fullName} avatarUrl={e.avatarUrl} size="sm" clickable={false} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{e.fullName}</p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {[e.positionLabel, e.departmentName].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {capabilities.map((c) => {
                const on = (grants[e.id] ?? []).includes(c.key);
                const key = `${e.id}:${c.key}`;
                return (
                  <button
                    key={c.key}
                    type="button"
                    disabled={busy === key}
                    onClick={() => toggle(e.id, c.key, on)}
                    aria-pressed={on}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50",
                      on
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-1)]"
                        : "bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--foreground)]",
                    )}
                  >
                    {on && <Check className="size-3.5" strokeWidth={3} />}
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--muted)]">{t("common.noResults")}</p>
        )}
      </div>
    </div>
  );
}
