import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getTask } from "@/server/queries/tasks";
import { TaskHeaderCard } from "@/components/tasks/task-header-card";
import { MyResponseCard } from "@/components/tasks/my-response-card";
import { ShareTaskChatButton } from "@/components/tasks/share-task-chat-button";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";

// Studiya tomonidagi vazifa sahifasi — faqat koʻrish va javob berish. Studiya faqat
// oʻzi ijrochi boʻlgan vazifani ocha oladi. Asosiy amal — «Javobim».
export default async function ContractorTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const { id } = await params;

  const data = await getTask(id);
  if (!data) notFound();

  const me = session.user;
  const myAssignment = data.assignees.find((a) => a.userId === me.id);
  // Studiya faqat oʻziga tayinlangan vazifani koʻra oladi.
  if (!myAssignment) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={data.task.title}
        back={<BackButton fallbackHref="/contractor/tasks" className="mt-0.5 shrink-0" />}
        actions={data.task.projectId ? <ShareTaskChatButton taskId={data.task.id} /> : undefined}
      />

      <div className="flex min-w-0 flex-col gap-8 lg:gap-12">
        <TaskHeaderCard
          creator={data.creator}
          task={{
            title: data.task.title,
            description: data.task.description,
            status: data.task.status,
            priority: data.task.priority,
            deadline: data.task.deadline as Date | null,
            createdAt: data.task.createdAt,
            registrationNumber: data.task.registrationNumber,
          }}
          projectName={data.project?.name ?? null}
        />

        <MyResponseCard
          taskId={data.task.id}
          myStatus={myAssignment.status}
          responseText={myAssignment.responseText}
          responseFileUrl={myAssignment.responseFileUrl}
          responseFileName={myAssignment.responseFileName}
          responseSubmittedAt={myAssignment.responseSubmittedAt as Date | null}
        />
      </div>
    </div>
  );
}
