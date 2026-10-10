import { IconInbox as Inbox, type Icon as TablerIcon } from "@tabler/icons-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: TablerIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-[var(--radius-card)] bg-[var(--surface-2)]">
        <Icon className="size-7 text-[var(--ink-3)]" stroke={1.75} />
      </div>
      <h3 className="t-h3 text-[var(--ink)]">{title}</h3>
      {description && <p className="mt-1.5 max-w-md t-body text-[var(--ink-2)]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
