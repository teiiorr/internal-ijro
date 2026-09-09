import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getContractorTasks } from "@/server/queries/tasks";
import { StudioTasksList } from "@/components/contractor/studio-tasks-card";
import { Card, CardContent } from "@/components/ui/card";
import { IconClipboardList as ClipboardList } from "@tabler/icons-react";

export const dynamic = "force-dynamic";

// Studiya uçun alohida "Vazifalar" bölimi — barça loyihalar böyiça unga berilgan
// vazifalar bir joyda (xodimlarning "Vazifalar" bölimi kabi).
export default async function ContractorTasksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const tasks = await getContractorTasks(session.user.id);

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
        <ClipboardList className="size-6 text-[var(--muted)]" />
        {t("nav.tasks")}
      </h1>
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-[var(--muted)]">
            {t("contractor.tasks.empty")}
          </CardContent>
        </Card>
      ) : (
        <StudioTasksList tasks={tasks} />
      )}
    </div>
  );
}
