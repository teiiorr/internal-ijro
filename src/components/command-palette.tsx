"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Item = { label: string; href: string; group: string };

const STATIC_ITEMS: Item[] = [
  { label: "Dashboard", href: "/dashboard", group: "Pages" },
  { label: "Tasks", href: "/tasks", group: "Pages" },
  { label: "New task", href: "/tasks/new", group: "Pages" },
  { label: "Projects", href: "/projects", group: "Pages" },
  { label: "New project", href: "/projects/new", group: "Pages" },
  { label: "Employees", href: "/employees", group: "Pages" },
  { label: "Invite employee", href: "/employees/new", group: "Pages" },
  { label: "Departments", href: "/departments", group: "Pages" },
  { label: "Contractors", href: "/contractors", group: "Pages" },
  { label: "Standup", href: "/reports/standup", group: "Pages" },
  { label: "Leaves", href: "/leaves", group: "Pages" },
  { label: "Notifications", href: "/notifications", group: "Pages" },
  { label: "Audit log", href: "/audit-log", group: "Pages" },
  { label: "Settings", href: "/settings", group: "Pages" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

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

  const filtered = useMemo(() => {
    if (!q) return STATIC_ITEMS;
    return STATIC_ITEMS.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));
  }, [q]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl">
        <Input
          placeholder="Type a command or page name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <div className="max-h-80 overflow-y-auto -mx-2 mt-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--muted)] px-3 py-4 text-center">No results.</p>
          ) : (
            filtered.map((i) => (
              <button
                key={i.href}
                onClick={() => { setOpen(false); router.push(i.href); }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--accent)] text-sm flex justify-between"
              >
                <span>{i.label}</span>
                <span className="text-xs text-[var(--muted)]">{i.group}</span>
              </button>
            ))
          )}
        </div>
        <p className="text-xs text-[var(--muted)] mt-2">Press <kbd className="px-1 py-0.5 rounded bg-[var(--secondary)]">⌘K</kbd> to toggle.</p>
      </DialogContent>
    </Dialog>
  );
}
