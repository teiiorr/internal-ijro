import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listAssignableUsers } from "@/server/queries/tasks";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewTaskForm } from "@/components/tasks/new-task-form";

export default async function NewTaskPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  if (["mutaxassis", "hr", "kontragent"].includes(session.user.position)) redirect("/tasks");

  const [assignees, prjs] = await Promise.all([
    listAssignableUsers(session.user.id, session.user.position, session.user.departmentId),
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
  ]);

  return (
    <Card className="max-w-3xl">
      <CardHeader><CardTitle>{t("tasks.newTitle")}</CardTitle></CardHeader>
      <CardContent>
        <NewTaskForm assignees={assignees} projects={prjs} />
      </CardContent>
    </Card>
  );
}
