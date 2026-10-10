import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { IconFileSpreadsheet } from "@tabler/icons-react";
import { requireUser } from "@/lib/session";
import type { Position } from "@/lib/db/schema";
import { Button } from "@/components/ui-biib/Button";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { getOrgTree, listDirectory, listSkills } from "@/server/queries/directory";
import { flattenTree } from "@/components/staff/staff-directory/logic";
import { StaffTabs, type StaffTab } from "@/components/staff/staff-directory/staff-tabs";
import { OrgTree } from "@/components/staff/staff-directory/org-tree";
import { DirectoryGrid } from "@/components/staff/staff-directory/directory-grid";

type SP = Promise<Record<string, string | string[] | undefined>>;

const STAFFING_EXPORT_ROLES: Position[] = ["direktor", "orinbosar", "hr"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TuzilmaPage({ searchParams }: { searchParams: SP }) {
  const me = await requireUser();
  if (me.position === "kontragent") redirect("/contractor/dashboard");

  const locale = await getLocale();
  const t = await getTranslations("staffX.staffDirectory");
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const q = (get("q") ?? "").trim().slice(0, 100);
  const rawDept = get("departmentId");
  const departmentId = rawDept && UUID_RE.test(rawDept) ? rawDept : null;
  const skill = (get("skill") ?? "").trim().toLowerCase().slice(0, 40) || null;
  const rawTab = get("tab");
  const tab: StaffTab =
    rawTab === "malumotnoma" || rawTab === "tuzilma"
      ? rawTab
      : q || departmentId || skill
        ? "malumotnoma"
        : "tuzilma";

  const [tree, people, skills] = await Promise.all([
    getOrgTree(locale),
    listDirectory(me, { q, departmentId: departmentId ?? undefined, skill: skill ?? undefined }, locale),
    listSkills(),
  ]);

  const departmentOptions = flattenTree(tree.departments).map(({ node, depth }) => ({
    id: node.id,
    name: node.name,
    depth,
  }));
  const canExportStaffing = STAFFING_EXPORT_ROLES.includes(me.position);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          canExportStaffing && (
            <Button asChild variant="glass" size="40" icon={IconFileSpreadsheet} className="print:hidden">
              <a href="/api/export/staffing" download>{t("staffingExport")}</a>
            </Button>
          )
        }
      />

      <StaffTabs
        initialTab={tab}
        treeLabel={t("tabTree")}
        directoryLabel={t("tabDirectory")}
        tree={<OrgTree tree={tree} />}
        directory={
          <DirectoryGrid
            people={people}
            departments={departmentOptions}
            skills={skills}
            current={{ q, departmentId, skill }}
          />
        }
      />
    </div>
  );
}
