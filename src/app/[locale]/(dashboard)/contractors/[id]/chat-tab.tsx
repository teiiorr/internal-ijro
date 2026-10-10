import { IconMessageCircle as Msg } from "@tabler/icons-react";
import { Card } from "@/components/ui-biib/Card";
import { Rows, Row } from "@/components/ui-biib/Rows";

/** Havolali roʻyxat: har bir loyiha oʻzining toʻliq ekranli suhbat sahifasini ochadi.
 *  Ichki akkordeon yoʻq — suhbatlar hech qachon yuqoridan pastga ochilmaydi. */
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
      <div className="flex flex-col items-center justify-center py-12 text-[var(--ink-3)]">
        <Msg className="mb-2 size-10 opacity-40" aria-hidden />
        <p className="t-small font-medium">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <Card bare className="px-5 sm:px-6">
      <Rows>
        {projects.map((p) => (
          <Row key={p.id} href={`/contractors/${companyId}/chat/${p.id}`}>
            <Msg className="size-[18px] shrink-0 text-[var(--ink-3)]" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium text-[var(--ink)]">{p.name}</span>
          </Row>
        ))}
      </Rows>
    </Card>
  );
}
