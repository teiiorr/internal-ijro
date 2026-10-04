import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { StudioDocumentsFull } from "@/components/contractor/studio-documents-full";
import { StudioGallery } from "@/components/contractor/studio-gallery";
import { getContractorDocuments, getContractorGallery } from "@/server/queries/projects";
import { getStudioCompany } from "@/server/queries/studio";

export const dynamic = "force-dynamic";

// Studiya: barcha loyihalardagi fayllar bir joyda (hujjatlar + rasmlar galereyasi).
export default async function StudioDocumentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const company = await getStudioCompany(session.user.email);
  if (!company) notFound();

  const [documents, images] = await Promise.all([getContractorDocuments(company.id), getContractorGallery(company.id)]);
  const projects = [...new Map(documents.map((d) => [d.projectId, { id: d.projectId, name: d.projectName }])).values()];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{t("studio.documents.title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("studio.documents.subtitle")}</p>
      </header>

      {documents.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-sm text-[var(--muted)]">{t("studio.documents.empty")}</CardContent></Card>
      ) : (
        <>
          <Card><CardContent className="p-5 sm:p-6"><StudioDocumentsFull documents={documents} /></CardContent></Card>
          {images.length > 0 && (
            <Card><CardContent className="p-5 sm:p-6"><StudioGallery images={images} projects={projects} /></CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}
