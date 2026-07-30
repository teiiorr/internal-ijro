import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { NormativeDocuments } from "@/components/normative/normative-documents";
import { listNormativeDocuments } from "@/server/queries/normative";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";

export default async function NormativeDocsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const me = session.user;
  const canManage = me.position !== "kontragent"; // all internal staff can upload
  const docs = await listNormativeDocuments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("normative.title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("normative.subtitle")}</p>
      </div>
      <Card>
        <CardContent className="p-5 sm:p-6">
          <NormativeDocuments
            documents={docs.map((d) => ({ ...d, uploadedAt: d.uploadedAt as Date }))}
            canManage={canManage}
            maxBytes={MAX_UPLOAD_BYTES}
          />
        </CardContent>
      </Card>
    </div>
  );
}
