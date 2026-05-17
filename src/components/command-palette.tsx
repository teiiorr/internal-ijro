"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Item = { labelKey: string; href: string };

const ITEMS: Item[] = [
  { labelKey: "nav.dashboard", href: "/dashboard" },
  { labelKey: "nav.tasks", href: "/tasks" },
  { labelKey: "tasks.new", href: "/tasks/new" },
  { labelKey: "nav.projects", href: "/projects" },
  { labelKey: "projects.new", href: "/projects/new" },
  { labelKey: "nav.employees", href: "/employees" },
  { labelKey: "employees.addBtn", href: "/employees/new" },
  { labelKey: "nav.departments", href: "/departments" },
  { labelKey: "nav.contractors", href: "/contractors" },
  { labelKey: "reports.standupTitle", href: "/reports/standup" },
  { labelKey: "nav.leaves", href: "/leaves" },
  { labelKey: "nav.notifications", href: "/notifications" },
  { labelKey: "nav.auditLog", href: "/audit-log" },
  { labelKey: "nav.settings", href: "/settings" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo(() => ITEMS.map((i) => ({ ...i, label: t(i.labelKey as Parameters<typeof t>[0]) })), [t]);
  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));
  }, [q, items]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl">
        <Input
          placeholder={t("commandPalette.placeholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <div className="max-h-80 overflow-y-auto -mx-2 mt-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--muted)] px-3 py-4 text-center">{t("commandPalette.noResults")}</p>
          ) : (
            filtered.map((i) => (
              <button
                key={i.href}
                onClick={() => { setOpen(false); router.push(i.href); }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--accent)] text-sm flex justify-between"
              >
                <span>{i.label}</span>
                <span className="text-xs text-[var(--muted)]">{t("commandPalette.groupPages")}</span>
              </button>
            ))
          )}
        </div>
        <p className="text-xs text-[var(--muted)] mt-2">{t("commandPalette.hint")}</p>
      </DialogContent>
    </Dialog>
  );
}
