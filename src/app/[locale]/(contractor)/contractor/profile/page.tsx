import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies } from "@/lib/db/schema";
import { SmoothImage } from "@/components/ui/smooth-image";
import { Heading } from "@/components/ui-biib/Heading";
import { Section } from "@/components/ui-biib/Section";
import { Card } from "@/components/ui-biib/Card";
import { FactList } from "@/components/ui-biib/FactList";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { formatDate } from "@/lib/dates";
import { DeveloperCard } from "@/components/settings/developer-card";

// Studiya profili — kompaniya maʼlumotkartasi. Mavzu va til sozlamalar sahifasida.
export default async function ContractorProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const rows = await db.select().from(externalCompanies).where(eq(externalCompanies.contactEmail, session.user.email)).limit(1);
  const c = rows[0];
  if (!c) return <p className="py-16 text-center t-small text-[var(--ink-3)]">{t("contractor.profile.noCompany")}</p>;

  const statusTone: StatusTone = c.status === "approved" ? "success" : c.status === "rejected" ? "danger" : "warning";
  const link = (href: string, text: string) => (
    <a href={href} className="font-medium text-[var(--tint)] hover:underline">{text}</a>
  );

  const contact = [
    { term: t("contractor.profile.contactPerson"), value: c.contactPerson ?? t("common.emptyValue") },
    ...(c.contactEmail ? [{ term: t("contractor.profile.email"), value: link(`mailto:${c.contactEmail}`, c.contactEmail) }] : []),
    ...(c.contactPhone ? [{ term: t("contractor.profile.phone"), value: link(`tel:${c.contactPhone}`, c.contactPhone) }] : []),
    ...(c.specialization ? [{ term: t("contractor.profile.specialization"), value: c.specialization }] : []),
    { term: t("contractor.profile.nda"), value: c.ndaAcceptedAt ? formatDate(c.ndaAcceptedAt as Date, locale) : t("common.emptyValue") },
  ];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 lg:gap-12">
      {/* Kompaniya identifikatsiyasi */}
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <div className="grid size-20 place-items-center overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-2)]">
          {c.logoUrl ? (
            <SmoothImage src={c.logoUrl} alt={c.name} className="size-full object-contain p-1.5" />
          ) : (
            <span className="text-3xl font-black text-[var(--ink-3)]">{c.name.trim().charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Heading level={1} trim className="break-words">{c.name}</Heading>
          <Status tone={statusTone}>{t(`status.${c.status}` as "status.pending")}</Status>
        </div>
      </div>

      <Section title={t("contractor.profile.contact")}>
        <Card>
          <FactList items={contact} />
        </Card>
      </Section>

      <DeveloperCard />
    </div>
  );
}
