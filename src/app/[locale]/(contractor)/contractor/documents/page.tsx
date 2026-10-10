import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui-biib/Card";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { Segmented, type SegmentedItem } from "@/components/ui-biib/Segmented";
import { StudioDocumentsFull } from "@/components/contractor/studio-documents-full";
import { StudioGallery } from "@/components/contractor/studio-gallery";
import { getContractorDocuments, getContractorGallery } from "@/server/queries/projects";
import { getStudioCompany } from "@/server/queries/studio";

export const dynamic = "force-dynamic";

// Studiya: barcha loyihalardagi fayllar bir joyda — Hujjatlar | Galereya.
export default async function StudioDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const company = await getStudioCompany(session.user.email);
  if (!company) notFound();

  const [documents, images] = await Promise.all([getContractorDocuments(company.id), getContractorGallery(company.id)]);
  const projects = [...new Map(documents.map((d) => [d.projectId, { id: d.projectId, name: d.projectName }])).values()];

  const sp = await searchParams;
  const view = sp.view === "images" && images.length > 0 ? "images" : "docs";

  if (documents.length === 0) {
    return (
      <div>
        <PageHeader title={t("studio.documents.title")} />
        <Card>
          <p className="py-10 text-center t-small text-[var(--ink-3)]">{t("studio.documents.empty")}</p>
        </Card>
      </div>
    );
  }

  const tabs: SegmentedItem[] = [{ href: "/contractor/documents?view=docs", label: t("studio.documents.title"), active: view === "docs" }];
  if (images.length > 0) {
    tabs.push({ href: "/contractor/documents?view=images", label: t("contractors.detail.tabs.gallery"), active: view === "images" });
  }

  return (
    <div>
      <PageHeader
        title={t("studio.documents.title")}
        tools={images.length > 0 ? <Segmented items={tabs} /> : undefined}
      />
      <Card>
        {view === "images" ? <StudioGallery images={images} projects={projects} /> : <StudioDocumentsFull documents={documents} />}
      </Card>
    </div>
  );
}
