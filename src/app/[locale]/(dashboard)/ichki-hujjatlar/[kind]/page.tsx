import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { InternalDocsTabs } from "@/components/internal-docs/internal-docs-tabs";
import { AddInternalDoc } from "@/components/internal-docs/add-internal-doc";
import { InternalDocsList } from "@/components/internal-docs/internal-docs-list";
import { listInternalDocuments } from "@/server/queries/internal-docs";
import { canUseInternalDocs, kindFromSlug } from "@/lib/internal-docs/logic";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";

/** Ichki hujjatlar: /ichki-hujjatlar/bildirgilar va /ichki-hujjatlar/buyruqlar. Faqat ichki xodimlar. */
export default async function InternalDocsPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind: slug } = await params;
  const kind = kindFromSlug(slug);
  if (!kind) notFound();

  const me = await requireUser();
  if (!canUseInternalDocs(me.position)) redirect("/contractor/dashboard");
  const t = await getTranslations();

  const docs = await listInternalDocuments(kind);

  return (
    <div>
      <PageHeader
        title={t(kind === "bildirgi" ? "nav.bildirgilar" : "nav.buyruqlar")}
        subtitle={t("nav.group.internalDocs")}
        tools={<InternalDocsTabs active={kind} />}
        actions={<AddInternalDoc kind={kind} maxBytes={MAX_UPLOAD_BYTES} />}
      />
      <InternalDocsList docs={docs} viewer={{ id: me.id, position: me.position }} />
    </div>
  );
}
