import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listAssignableUsers } from "@/server/queries/tasks";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { BackButton } from "@/components/ui/back-button";
import { Card } from "@/components/ui-biib/Card";
import { NewTaskForm } from "@/components/tasks/new-task-form";

export default async function NewTaskPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  // Oçiq tayinlaş: har qanday içki xodim vazifa yaratişi/tayinlaşi mumkin (kontragentlar bundan mustasno).
  if (session.user.position === "kontragent") redirect("/tasks");

  const [assignees, prjs] = await Promise.all([
    listAssignableUsers(session.user.id, session.user.position, session.user.departmentId),
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("tasks.newTitle")} back={<BackButton fallbackHref="/tasks" />} />
      <Card>
        <NewTaskForm assignees={assignees} projects={prjs} />
      </Card>
    </div>
  );
}
