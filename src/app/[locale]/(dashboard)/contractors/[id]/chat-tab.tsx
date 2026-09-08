import Link from "next/link";
import { IconMessageCircle as Msg, IconChevronRight as Chevron } from "@tabler/icons-react";

/** List-that-links: each project opens its full-screen conversation route.
 *  No inline accordion — chats never expand top-to-bottom. */
export function StudioChatTab({
  companyId,
  projects,
  emptyLabel,
}: {
  companyId: string;
  projects: { id: string; name: string }[];
  emptyLabel: string;
}) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)]">
        <Msg className="mb-2 size-10 opacity-40" />
        <p className="text-sm font-medium">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {projects.map((p) => (
        <Link
          key={p.id}
          href={`/contractors/${companyId}/chat/${p.id}`}
          className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-1)] transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow-2)] active:scale-[0.995]"
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">
            <Msg className="size-5" />
          </div>
          <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
          <Chevron className="size-4 shrink-0 text-[var(--subtle)]" />
        </Link>
      ))}
    </div>
  );
}
