import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { BackButton } from "@/components/ui/back-button";
import { SmetaArchive } from "@/components/councils/smeta-archive";

const KINDS = ["ekspert", "smeta"] as const;

export default async function CouncilArchivePage({ params }: { params: Promise<{ kind: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { kind } = await params;
  if (!KINDS.includes(kind as (typeof KINDS)[number])) notFound();
  const t = await getTranslations();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BackButton fallbackHref={`/kengashlar/${kind}`} />
      </div>
      {kind === "smeta" ? (
        <SmetaArchive />
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] py-16 text-center text-sm text-[var(--muted)]">
          {t("kengash.archive.empty")}
        </div>
      )}
    </div>
  );
}
