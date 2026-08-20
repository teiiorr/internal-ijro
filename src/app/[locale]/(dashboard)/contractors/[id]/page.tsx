import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { BackButton } from "@/components/ui/back-button";
import {
  getContractorDetail,
  getContractorDocuments,
  getContractorGallery,
  getContractorMessageCounts,
  getStageMessages,
} from "@/server/queries/projects";
import { StudioDetailTabs } from "@/components/contractor/studio-detail-tabs";
import { StudioInfoCard } from "@/components/contractor/studio-info-card";
import { StudioProjectsList } from "@/components/contractor/studio-projects-list";
import { StudioDocumentsFull } from "@/components/contractor/studio-documents-full";
import { StudioGallery } from "@/components/contractor/studio-gallery";
import { StudioChatTab } from "./chat-tab";

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const EXTRA_USERS = ["90956fa9-4892-4677-a31b-10af180e341a"];
  if (!["direktor", "orinbosar", "koordinator", "bolim_boshligi"].includes(session.user.position) && !EXTRA_USERS.includes(session.user.id)) redirect("/dashboard");

  const t = await getTranslations();
  const { id } = await params;
  const detail = await getContractorDetail(id);
  if (!detail) notFound();

  const { company, projects: prjs, stages, lastActivity } = detail;

  const [docs, gallery, msgCounts] = await Promise.all([
    getContractorDocuments(id),
    getContractorGallery(id),
    getContractorMessageCounts(id),
  ]);

  const countsByStage: Record<string, number> = {};
  for (const r of msgCounts) {
    const key = r.stage_id ?? "__general__";
    countsByStage[key] = (countsByStage[key] ?? 0) + Number(r.cnt);
  }

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-center gap-3">
        <BackButton fallbackHref="/contractors" />
        <h1 className="text-2xl font-bold truncate sm:text-3xl">{company.name}</h1>
      </div>

      <StudioDetailTabs
        infoSlot={
          <StudioInfoCard
            company={{
              ...company,
              rating: company.rating as string | null,
              ndaAcceptedAt: company.ndaAcceptedAt as Date | null,
            }}
            stats={{
              projectCount: prjs.length,
              docCount: docs.length,
              lastActivity,
            }}
          />
        }
        projectsSlot={
          <StudioProjectsList
            projects={prjs.map((p) => ({
              ...p,
              progressPercentage: p.progressPercentage as number | null,
              deadline: p.deadline as string | Date | null,
              startDate: p.startDate as string | Date | null,
            }))}
          />
        }
        chatSlot={
          <StudioChatTab
            projects={prjs.map((p) => ({ id: p.id, name: p.name }))}
            stages={stages.map((s) => ({
              id: s.id,
              projectId: s.projectId,
              name: s.name,
              orderNumber: s.orderIndex,
              status: s.status,
            }))}
            countsByStage={countsByStage}
            currentUserId={session.user.id}
          />
        }
        docsSlot={
          <StudioDocumentsFull
            documents={docs.map((d) => ({
              ...d,
              fileSize: d.fileSize as number | null,
              fileMimeType: d.fileMimeType as string | null,
            }))}
          />
        }
        gallerySlot={
          <StudioGallery
            images={gallery.map((g) => ({
              id: g.id,
              fileUrl: g.fileUrl,
              fileName: g.fileName,
              uploadedAt: g.uploadedAt,
              projectName: g.projectName,
            }))}
            projects={prjs.map((p) => ({ id: p.id, name: p.name }))}
          />
        }
      />
    </div>
  );
}
