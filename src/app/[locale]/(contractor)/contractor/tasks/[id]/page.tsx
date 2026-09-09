import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getTask } from "@/server/queries/tasks";
import { TaskHeaderCard } from "@/components/tasks/task-header-card";
import { MyResponseCard } from "@/components/tasks/my-response-card";
import { ShareTaskChatButton } from "@/components/tasks/share-task-chat-button";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";

// Studiya tomonidagi vazifa sahifasi — xodimlarnikiga öxşaş, lekin faqat köriş va
// javob beriş. Studiya faqat özi ijroçi bölgan vazifani oça oladi.
export default async function ContractorTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const { id } = await params;

  const data = await getTask(id);
  if (!data) notFound();

  const me = session.user;
  const myAssignment = data.assignees.find((a) => a.userId === me.id);
  // Studiya faqat öziga tayinlangan vazifani köra oladi.
  if (!myAssignment) notFound();

  return (
    <div className="max-w-3xl space-y-5 stagger-children">
      <div className="flex items-start gap-2 flex-wrap">
        <BackButton fallbackHref="/contractor/tasks" className="mt-0.5" />
        <h1 className="min-w-0 flex-1 break-words text-base font-semibold leading-snug tracking-tight sm:text-lg">
          {data.task.title}
        </h1>
        {data.task.projectId && <ShareTaskChatButton taskId={data.task.id} />}
      </div>

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
  );
}
