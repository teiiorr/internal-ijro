"use client";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconChevronRight,
  IconCrown,
  IconSitemap,
  IconUserQuestion,
  IconUsers,
} from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { flattenTree, type DeptNode, type OrgTree as OrgTreeData } from "./logic";
import { PersonCardCompact } from "./person-card";

const PRINT_FLAT = "print:bg-transparent print:shadow-none print:backdrop-blur-none print:border print:border-[var(--border-strong)]";
const LABEL = "text-[11px] font-semibold uppercase tracking-wide text-[var(--subtle)]";

function DeptNodeView({
  node,
  depth,
  open,
  onToggle,
}: {
  node: DeptNode;
  depth: number;
  open: Set<string>;
  onToggle: (id: string) => void;
}) {
  const t = useTranslations("staffX.staffDirectory");
  const tr = useTranslations();
  const locale = useLocale();
  const isOpen = open.has(node.id);
  const hasMembers = node.members.length > 0;
  const membersId = `dept-members-${node.id}`;
  const headName = node.head ? localizeName(node.head.fullName, locale) : null;

  return (
    <li
      className={cn(
        "relative",
        // Ota boʻlimning chap chizigʻidan shu kartaga gorizontal ulagich.
        depth > 0 &&
          "before:absolute before:-left-4 before:top-8 before:h-0.5 before:w-4 before:bg-[var(--border-strong)] sm:before:-left-6 sm:before:w-6"
      )}
    >
      <Card className={cn("min-w-0 p-4 sm:p-5", PRINT_FLAT, "print:break-inside-avoid")}>
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          {hasMembers ? (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              aria-expanded={isOpen}
              aria-controls={membersId}
              aria-label={isOpen ? t("hideMembers") : t("showMembers")}
              title={isOpen ? t("hideMembers") : t("showMembers")}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] print:hidden"
            >
              <IconChevronRight className={cn("size-4 transition-transform duration-200", isOpen && "rotate-90")} />
            </button>
          ) : (
            <span className="grid size-8 shrink-0 place-items-center text-[var(--subtle)] print:hidden" aria-hidden>
              <IconSitemap className="size-4" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <h3 className="min-w-0 break-words pt-1 text-base font-bold leading-snug tracking-tight sm:text-[17px]">
                {node.name}
              </h3>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-3)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] tabular">
                  <IconUsers className="size-3.5" aria-hidden />
                  {t("members", { count: node.memberCount })}
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
              {node.head && headName ? (
                <div className="flex min-w-0 items-center gap-2.5">
                  <UserAvatar
                    name={headName}
                    avatarUrl={node.head.avatarUrl}
                    size="sm"
                    position={node.head.positionTitle ?? tr(`positions.${node.head.position}`)}
                    department={node.name}
                  />
                  <div className="min-w-0">
                    <p className={LABEL}>{t("head")}</p>
                    <Link
                      href={`/employees/${node.head.id}`}
                      className="block truncate text-sm font-semibold transition-colors hover:text-[var(--primary)]"
                    >
                      {headName}
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--danger)]">
                  <IconUserQuestion className="size-4 shrink-0" aria-hidden />
                  {t("noHead")}
                </p>
              )}

              {node.coordinators.length > 0 && (
                <div className="min-w-0">
                  <p className={LABEL}>{t("coordinators")}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {node.coordinators.map((c) => {
                      const cName = localizeName(c.fullName, locale);
                      return (
                        <Link
                          key={c.id}
                          href={`/employees/${c.id}`}
                          title={cName}
                          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                        >
                          <UserAvatar name={cName} avatarUrl={c.avatarUrl} size="xs" clickable={false} />
                          <span className="sr-only">{cName}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {hasMembers && (
          <div
            id={membersId}
            className={cn("mt-4 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3", isOpen ? "grid" : "hidden print:grid")}
          >
            {node.members.map((p) => (
              <PersonCardCompact key={p.id} person={p} />
            ))}
          </div>
        )}
      </Card>

      {node.children.length > 0 && (
        <ul
          className="ml-3 mt-3 space-y-3 border-l-2 border-[var(--border-strong)] pl-4 sm:ml-5 sm:pl-6"
        >
          {node.children.map((c) => (
            <DeptNodeView key={c.id} node={c} depth={depth + 1} open={open} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Tashkiliy tuzilma: rahbariyat, ichma-ich boʻlimlar (boshliq, koordinatorlar, aʼzolar), biriktirilmaganlar. */
export function OrgTree({ tree }: { tree: OrgTreeData }) {
  const t = useTranslations("staffX.staffDirectory");
  const expandable = useMemo(
    () => flattenTree(tree.departments).filter((x) => x.node.members.length > 0).map((x) => x.node.id),
    [tree.departments]
  );
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOpen = expandable.length > 0 && expandable.every((id) => open.has(id));
  const anyOpen = expandable.some((id) => open.has(id));

  return (
    <div className="space-y-6">
      {expandable.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(new Set(expandable))}
            disabled={allOpen}
          >
            <IconArrowsMaximize className="size-4" />
            {t("expandAll")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(new Set())} disabled={!anyOpen}>
            <IconArrowsMinimize className="size-4" />
            {t("collapseAll")}
          </Button>
        </div>
      )}

      {tree.leadership.length > 0 && (
        <section aria-labelledby="org-leadership" className="space-y-3">
          <h2 id="org-leadership" className="flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg">
            <IconCrown className="size-5 text-[var(--primary)]" aria-hidden />
            {t("leadership")}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tree.leadership.map((p) => (
              <PersonCardCompact
                key={p.id}
                person={p}
                size="md"
                className={cn("bg-[var(--card)] p-3 shadow-[var(--shadow-1)]", "print:shadow-none")}
              />
            ))}
          </div>
        </section>
      )}

      {tree.departments.length === 0 ? (
        <Card className={PRINT_FLAT}>
          <EmptyState icon={IconSitemap} title={t("noDepartments")} />
        </Card>
      ) : (
        <ul aria-label={t("tabTree")} className="space-y-3">
          {tree.departments.map((n) => (
            <DeptNodeView key={n.id} node={n} depth={0} open={open} onToggle={toggle} />
          ))}
        </ul>
      )}

      {tree.unassigned.length > 0 && (
        <section aria-labelledby="org-unassigned" className="space-y-3">
          <h2
            id="org-unassigned"
            className="flex flex-wrap items-center gap-2 text-base font-bold tracking-tight sm:text-lg"
          >
            {t("unassigned")}
            <span className="rounded-full bg-[var(--surface-3)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] tabular">
              {t("members", { count: tree.unassigned.length })}
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {tree.unassigned.map((p) => (
              <PersonCardCompact key={p.id} person={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
