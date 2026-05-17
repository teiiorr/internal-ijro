"use client";
import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Search, Info, BadgeCheck, Bell, Clock4 } from "lucide-react";
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

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
  return (
    <div className="size-10 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-sm font-semibold text-[var(--primary)]">
      {initials}
    </div>
  );
}

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
    <Card className="overflow-hidden">
      <div className="px-7 pt-6 pb-4">
        <h3 className="font-display text-lg font-bold tracking-tight">{t("tasks.sections.people")}</h3>
      </div>

      <div className="px-7 pb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative md:max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--subtle)]" />
          <input
            placeholder={t("common.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-2)] pl-10 pr-3 text-[14px] placeholder:text-[var(--subtle)] focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:shadow-[0_0_0_4px_var(--primary-soft)] transition-[border-color,box-shadow] duration-150"
          />
        </div>
        <div className="flex gap-1 ml-auto bg-[var(--surface-3)] rounded-[10px] p-1">
          {([
            ["all", t("common.all"), "text-[var(--foreground)]"],
            ["in_progress", t("status.in_progress"), "text-[var(--primary)]"],
            ["completed", t("status.completed"), "text-[var(--success)]"],
          ] as const).map(([k, label, color]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "px-4 py-1.5 rounded-[8px] text-sm font-semibold transition-all",
                filter === k
                  ? `bg-[var(--background-elevated)] shadow-soft ${color}`
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pb-5 space-y-1">
        {filtered.map((a) => (
          <div
            key={a.id + (a.isWatcher ? "-w" : "")}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-4 py-3 transition-colors",
              a.isPrimary
                ? "bg-[var(--primary-soft)] ring-1 ring-inset ring-[var(--primary)]/15"
                : "hover:bg-[var(--surface-3)]"
            )}
          >
            <Initials name={a.fullName} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-[15px]">{a.fullName}</p>
                {a.status === "completed" && <BadgeCheck className="size-[18px] text-[var(--success)]" aria-label="Completed" />}
                {a.isWatcher && <Bell className="size-[18px] text-[var(--warning)]" aria-label="Watcher" />}
              </div>
              <p className="text-[13px] text-[var(--muted)] truncate">{a.departmentName ?? "—"}</p>
            </div>
            <div className="flex items-center gap-3 text-[var(--muted)]">
              <div className="hidden sm:flex items-center gap-1.5 text-[13px] whitespace-nowrap tabular">
                <Clock4 className="size-3.5" />
                {fmt(a.updatedAt)}
              </div>
              <button className="size-8 rounded-full hover:bg-[var(--background-elevated)] flex items-center justify-center" aria-label="Info">
                <Info className="size-4" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-[var(--muted)] py-10 text-sm">{t("common.noResults")}</p>
        )}
      </div>
    </Card>
  );
}
