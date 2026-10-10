import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/ui-biib/PageHeader";
import { NormativeDocuments } from "@/components/normative/normative-documents";
import { AddNormativeDoc } from "@/components/normative/add-normative-doc";
import { listNormativeDocuments } from "@/server/queries/normative";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";
import { MyPendingAcks } from "@/components/staff/normative-ack/my-pending-acks";
import { getAckComposerOptions, listAckSummaries, listMyPendingAcks } from "@/server/queries/normative-ack";
import { tashkentYmd } from "@/components/staff/normative-ack/logic";

export default async function NormativeDocsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const me = session.user;
  const canManage = me.position !== "kontragent"; // barça içki xodimlar yuklay oladi
  const sp = await searchParams;
  const ack = typeof sp.ack === "string" ? sp.ack.toLowerCase() : null;
  // Tanishtirishga yuborish: rahbariyat + HR (istalgan auditoriya), boʻlim boshligʻi / koordinator (faqat oʻz boʻlimlari).
  const canSendAck = ["direktor", "orinbosar", "hr", "bolim_boshligi", "koordinator"].includes(me.position);
  const viewer = { id: me.id, position: me.position, departmentId: me.departmentId ?? null, email: me.email };

  const [docs, pendingAcks, ackSummaries, ackOptions] = await Promise.all([
    listNormativeDocuments(),
    listMyPendingAcks(me.id),
    listAckSummaries(viewer),
    canSendAck ? getAckComposerOptions(viewer) : Promise.resolve(undefined),
  ]);

  const folderNames = [...new Set(docs.map((d) => d.category).filter((c): c is string => !!c))].sort((a, b) =>
    a.localeCompare(b)
  );

  return (
    <div>
      <PageHeader
        title={t("normative.title")}
        actions={canManage ? <AddNormativeDoc folderNames={folderNames} maxBytes={MAX_UPLOAD_BYTES} /> : undefined}
      />
      <div className="flex min-w-0 flex-col gap-8 lg:gap-12">
        {pendingAcks.length > 0 && <MyPendingAcks items={pendingAcks} highlight={ack} />}
        <NormativeDocuments
          documents={docs.map((d) => ({ ...d, uploadedAt: d.uploadedAt as Date }))}
          canManage={canManage}
          currentUserId={me.id}
          currentUserPosition={me.position}
          canSendAck={canSendAck}
          ackSummaries={ackSummaries}
          allDocs={docs.map((d) => ({ id: d.id, fileName: d.fileName }))}
          ackOptions={ackOptions}
          today={tashkentYmd()}
        />
      </div>
    </div>
  );
}
