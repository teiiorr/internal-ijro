import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { IconStarFilled as Star, IconMail as Mail, IconPhone as Phone, IconClockHour4 as Clock } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/status-tag";
import { SmoothImage } from "@/components/ui/smooth-image";
import { timeAgo } from "@/lib/dates";
import {
  getContractorDetail,
  getContractorReviewProjects,
  getContractorDocuments,
  getContractorGallery,
  getContractorMessageCounts,
} from "@/server/queries/projects";
import { canEditProjects } from "@/lib/permissions/project-editors";
import { hasGrant } from "@/lib/permissions/grants";
import { canViewContractorChats, isContractorManager } from "@/lib/permissions/contractors";
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
  if (!(await canViewContractorChats(session.user))) redirect("/dashboard");
  // Boşqaruvçilar tahrirlaydi; egasi ruxsat bergan xodimlar faqat köradi.
  const canManage = isContractorManager(session.user);

  const t = await getTranslations();
  const locale = await getLocale();
  const { id } = await params;
  const { review: autoExpandProjectId } = await searchParams;
  const detail = await getContractorDetail(id);
  if (!detail) notFound();

  const { company, projects: prjs, lastActivity, lastLoginAt } = detail;
  // Körib chiqiş huquqi = körib chiqiş server action'lari qöllaydigan aynan şu tekşiruv.
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
  return (
    <div className="space-y-5 stagger-children">
      <BackButton fallbackHref="/contractors" />

      {/* Hero sarlavha — ular kim, ahvoli qanday, bir qaraşda */}
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
            {canManage && (
              <div className="flex items-center gap-1">
                <RenameStudioButton companyId={company.id} currentName={company.name} />
                <DeleteStudioButton companyId={company.id} studioName={company.name} hasProjects={prjs.length > 0} />
              </div>
            )}
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm">
            <Clock className="size-4 text-[var(--muted)]" />
            <span className="text-[var(--muted)]">{t("contractors.lastOnline")}:</span>
            <span className="font-semibold">{lastLoginAt ? timeAgo(lastLoginAt as Date, locale) : t("contractors.neverOnline")}</span>
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
            canManage={canManage}
          />
        }
        projectsSlot={
          <StudioProjectsList
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
