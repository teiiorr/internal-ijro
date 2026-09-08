import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { IconStarFilled as Star, IconMail as Mail, IconPhone as Phone, IconFolder as Folder, IconFile as File, IconClockHour4 as Clock, IconShieldCheck as Shield } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { SmoothImage } from "@/components/ui/smooth-image";
import { formatDate } from "@/lib/dates";
import {
  getContractorDetail,
  getContractorReviewProjects,
  getContractorDocuments,
  getContractorGallery,
  getContractorMessageCounts,
} from "@/server/queries/projects";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { hasGrant } from "@/lib/permissions/grants";
import { StudioDetailTabs } from "@/components/contractor/studio-detail-tabs";
import { StudioInfoCard } from "@/components/contractor/studio-info-card";
import { StudioProjectsList } from "@/components/contractor/studio-projects-list";
import { StudioDocumentsFull } from "@/components/contractor/studio-documents-full";
import { StudioGallery } from "@/components/contractor/studio-gallery";
import { RenameStudioButton, DeleteStudioButton } from "@/components/contractor/studio-crud-dialogs";
import { StudioChatTab } from "./chat-tab";

export default async function ContractorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const EXTRA_USERS = ["90956fa9-4892-4677-a31b-10af180e341a"];
  if (!["direktor", "orinbosar", "koordinator", "bolim_boshligi"].includes(session.user.position) && !EXTRA_USERS.includes(session.user.id)) redirect("/dashboard");

  const t = await getTranslations();
  const locale = await getLocale();
  const { id } = await params;
  const { review: autoExpandProjectId } = await searchParams;
  const detail = await getContractorDetail(id);
  if (!detail) notFound();

  const { company, projects: prjs, lastActivity } = detail;
  // Review authority = the same check the review server actions enforce.
  const isEditor = canEditProjects(session.user.email) || (await hasGrant(session.user.id, "projects.edit"));
  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 104857600);

  const [reviewProjects, docs, gallery, msgCounts] = await Promise.all([
    getContractorReviewProjects(id),
    getContractorDocuments(id),
    getContractorGallery(id),
    getContractorMessageCounts(id),
  ]);

  let chatTotal = 0;
  for (const r of msgCounts) chatTotal += Number(r.cnt);
  const statusTone: StatusTone = company.status === "approved" ? "green" : company.status === "rejected" ? "red" : "amber";

  return (
    <div className="space-y-5 stagger-children">
      <BackButton fallbackHref="/contractors" />

      {/* Hero header — who they are, how healthy, at a glance */}
      <Card>
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start gap-4">
            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[var(--surface-2)] ring-1 ring-[var(--border)] sm:size-20">
              {company.logoUrl ? (
                <SmoothImage src={company.logoUrl} alt={company.name} className="size-full object-contain p-1.5" />
              ) : (
                <span className="text-3xl font-black text-[var(--subtle)]">{company.name.trim().charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">{company.name}</h1>
                <StatusTag tone={statusTone} size="lg">{t(`status.${company.status}` as "status.pending")}</StatusTag>
                {company.rating && (
                  <StatusTag tone="amber" size="lg"><Star className="size-4" />{Number(company.rating).toFixed(1)}</StatusTag>
                )}
              </div>
              {company.contactPerson && <p className="mt-1 text-sm font-medium text-[var(--muted)]">{company.contactPerson}</p>}
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--subtle)]">
                {company.contactEmail && <a href={`mailto:${company.contactEmail}`} className="inline-flex items-center gap-1 hover:text-[var(--primary)]"><Mail className="size-3.5" />{company.contactEmail}</a>}
                {company.contactPhone && <a href={`tel:${company.contactPhone}`} className="inline-flex items-center gap-1 hover:text-[var(--primary)]"><Phone className="size-3.5" />{company.contactPhone}</a>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <RenameStudioButton companyId={company.id} currentName={company.name} />
              <DeleteStudioButton companyId={company.id} studioName={company.name} hasProjects={prjs.length > 0} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label={t("contractors.detail.tabs.projects")} value={prjs.length} icon={<Folder className="size-4" />} tone="primary" />
            <StatCard label={t("contractors.detail.tabs.docs")} value={docs.length} icon={<File className="size-4" />} />
            <StatCard label={t("contractors.detail.tabs.chat")} value={chatTotal} icon={<Clock className="size-4" />} />
            <StatCard label="NDA" value={company.ndaAcceptedAt ? "✓" : "—"} icon={<Shield className="size-4" />} tone={company.ndaAcceptedAt ? "success" : "default"} hint={company.ndaAcceptedAt ? formatDate(company.ndaAcceptedAt as Date, locale) : undefined} />
          </div>
        </CardContent>
      </Card>

      <StudioDetailTabs
        counts={{ projects: prjs.length, chat: chatTotal, docs: docs.length, gallery: gallery.length }}
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
            companyId={company.id}
            projects={reviewProjects}
            isEditor={isEditor}
            autoExpandProjectId={autoExpandProjectId}
            maxBytes={maxBytes}
          />
        }
        chatSlot={
          <StudioChatTab
            companyId={company.id}
            projects={prjs.map((p) => ({ id: p.id, name: p.name }))}
            emptyLabel={t("contractors.detail.noProjects")}
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
