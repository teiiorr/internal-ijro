import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-14 px-6">
      <div className="size-16 rounded-md bg-[var(--surface-3)] mx-auto mb-4 flex items-center justify-center">
        <Icon className="size-8 text-[var(--muted)]" />
      </div>
      <h3 className="text-lg font-bold tracking-tight mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--muted)] max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
