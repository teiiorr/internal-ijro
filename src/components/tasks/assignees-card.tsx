"use client";
import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Clock, Info, BadgeCheck, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export type AssigneeItem = {
  id: string;
  fullName: string;
  departmentName: string | null;
  status: "todo" | "in_progress" | "under_review" | "completed" | "rejected";
  updatedAt: Date | string;
  isPrimary?: boolean;
  isWatcher?: boolean;
};

type Filter = "all" | "in_progress" | "completed";

export function AssigneesCard({ items }: { items: AssigneeItem[] }) {
  const t = useTranslations();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => {
      if (term && !i.fullName.toLowerCase().includes(term) && !(i.departmentName ?? "").toLowerCase().includes(term)) return false;
      if (filter === "in_progress" && !["todo", "in_progress", "under_review", "rejected"].includes(i.status)) return false;
      if (filter === "completed" && i.status !== "completed") return false;
      return true;
    });
  }, [items, q, filter]);

  const fmt = (d: Date | string) =>
    new Intl.DateTimeFormat("uz-UZ", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">{t("tasks.sections.people")}</h3>
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <Input
            placeholder={t("common.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="md:max-w-md"
          />
          <div className="flex gap-1 ml-auto bg-[var(--secondary)] rounded-lg p-1">
            {([
              ["all", t("common.all")],
              ["in_progress", t("status.in_progress")],
              ["completed", t("status.completed")],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                  filter === k
                    ? k === "in_progress"
                      ? "bg-[var(--background-elevated)] text-[var(--primary)] shadow-sm"
                      : k === "completed"
                        ? "bg-[var(--background-elevated)] text-[var(--success)] shadow-sm"
                        : "bg-[var(--background-elevated)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3",
                a.isPrimary ? "bg-[var(--primary)]/8 ring-1 ring-[var(--primary)]/20" : "hover:bg-[var(--accent)]"
              )}
            >
              <div className="size-10 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center">
                <Clock className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{a.fullName}</p>
                  {a.status === "completed" && <BadgeCheck className="size-4 text-[var(--primary)]" aria-label="Completed" />}
                  {a.isWatcher && <Bell className="size-4 text-[var(--warning)]" aria-label="Watcher" />}
                </div>
                <p className="text-sm text-[var(--muted)] truncate">{a.departmentName ?? "—"}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-[var(--muted)] whitespace-nowrap">{fmt(a.updatedAt)}</p>
                <button className="text-[var(--muted)] hover:text-[var(--foreground)]" aria-label="Info">
                  <Info className="size-4" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-[var(--muted)] py-8 text-sm">{t("common.noResults")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
