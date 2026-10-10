"use client";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconChevronRight,
  IconSitemap,
} from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui-biib/Button";
import { Card } from "@/components/ui-biib/Card";
import { Section } from "@/components/ui-biib/Section";
import { Status } from "@/components/ui-biib/Status";
import { Rows, Row } from "@/components/ui-biib/Rows";
import { UserAvatar } from "@/components/ui/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { localizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { flattenTree, type DeptNode, type OrgTree as OrgTreeData, type PersonLite } from "./logic";

/** Maʼlumotnoma uslubidagi odam qatori: avatar, ism, lavozim — butun qator havola. */
function PersonRow({ person }: { person: PersonLite }) {
  const tr = useTranslations();
  const locale = useLocale();
  const name = localizeName(person.fullName, locale);
  const title = person.positionTitle ?? tr(`positions.${person.position}`);
  return (
    <Row href={`/employees/${person.id}`}>
      <UserAvatar name={name} avatarUrl={person.avatarUrl} size="xs" clickable={false} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{name}</p>
        <p className="mt-0.5 truncate t-small text-[var(--ink-3)]">{title}</p>
      </div>
    </Row>
  );
}

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
    <li className="min-w-0">
      <Card className="min-w-0 print:break-inside-avoid">
        <div className="flex min-w-0 items-start gap-3">
          {hasMembers ? (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              aria-expanded={isOpen}
              aria-controls={membersId}
              aria-label={isOpen ? t("hideMembers") : t("showMembers")}
              title={isOpen ? t("hideMembers") : t("showMembers")}
              className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-s)] text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)] print:hidden"
            >
              <IconChevronRight className={cn("size-4 transition-transform duration-200", isOpen && "rotate-90")} />
            </button>
          ) : (
            <span className="grid size-8 shrink-0 place-items-center text-[var(--ink-3)] print:hidden" aria-hidden>
              <IconSitemap className="size-4" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 className="min-w-0 break-words font-[family-name:var(--font-ui)] text-[1.0625rem] font-bold tracking-tight text-[var(--ink)]">
                {node.name}
              </h3>
              <span className="shrink-0 t-micro tabular-nums text-[var(--ink-3)]">
                {t("members", { count: node.memberCount })}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-10">
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
                    <p className="t-micro text-[var(--ink-3)]">{t("head")}</p>
                    <Link
                      href={`/employees/${node.head.id}`}
                      className="block truncate text-[0.9375rem] font-semibold text-[var(--ink)] transition-colors hover:text-[var(--tint)]"
                    >
                      {headName}
                    </Link>
                  </div>
                </div>
              ) : (
                <Status tone="danger">{t("noHead")}</Status>
              )}

              {node.coordinators.length > 0 && (
                <div className="min-w-0">
                  <p className="t-micro text-[var(--ink-3)]">{t("coordinators")}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {node.coordinators.map((c) => {
                      const cName = localizeName(c.fullName, locale);
                      return (
                        <Link
                          key={c.id}
                          href={`/employees/${c.id}`}
                          title={cName}
                          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)]"
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
          <div id={membersId} className={cn("mt-4", isOpen ? "block" : "hidden print:block")}>
            <Rows>
              {node.members.map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
            </Rows>
          </div>
        )}
      </Card>

      {node.children.length > 0 && (
        <ul className="ml-4 mt-4 space-y-4 border-l border-[var(--line)] pl-4 sm:ml-6 sm:pl-6">
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
    [tree.departments],
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
    <div className="flex flex-col gap-8 lg:gap-12">
      {tree.leadership.length > 0 && (
        <Section title={t("leadership")} headingLevel={2}>
          <Card bare className="px-5 sm:px-6">
            <Rows>
              {tree.leadership.map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
            </Rows>
          </Card>
        </Section>
      )}

      <div className="min-w-0">
        {expandable.length > 0 && (
          <div className="mb-4 flex flex-wrap justify-end gap-2 print:hidden">
            <Button
              type="button"
              variant="glass"
              size="40"
              icon={IconArrowsMaximize}
              onClick={() => setOpen(new Set(expandable))}
              disabled={allOpen}
            >
              {t("expandAll")}
            </Button>
            <Button
              type="button"
              variant="glass"
              size="40"
              icon={IconArrowsMinimize}
              onClick={() => setOpen(new Set())}
              disabled={!anyOpen}
            >
              {t("collapseAll")}
            </Button>
          </div>
        )}
        {tree.departments.length === 0 ? (
          <Card>
            <EmptyState icon={IconSitemap} title={t("noDepartments")} />
          </Card>
        ) : (
          <ul aria-label={t("tabTree")} className="space-y-4">
            {tree.departments.map((n) => (
              <DeptNodeView key={n.id} node={n} depth={0} open={open} onToggle={toggle} />
            ))}
          </ul>
        )}
      </div>

      {tree.unassigned.length > 0 && (
        <Section title={t("unassigned")} meta={t("members", { count: tree.unassigned.length })} headingLevel={2}>
          <Card bare className="px-5 sm:px-6">
            <Rows>
              {tree.unassigned.map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
            </Rows>
          </Card>
        </Section>
      )}
    </div>
  );
}
