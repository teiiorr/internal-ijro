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
import { FactList, type Fact } from "@/components/ui-biib/FactList";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import { formatDate } from "@/lib/dates";
import { DeveloperCard } from "@/components/settings/developer-card";

// Studiya profili — kompaniya maʼlumotkartasi: identifikatsiya kartasi + ikki zich
// jadval (maʼlumotlar / aloqa). Mavzu va til sozlamalar sahifasida.
export default async function ContractorProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const rows = await db
    .select()
    .from(externalCompanies)
    .where(eq(externalCompanies.contactEmail, session.user.email))
    .limit(1);
  const c = rows[0];
  if (!c) return <p className="py-16 text-center t-small text-[var(--ink-3)]">{t("contractor.profile.noCompany")}</p>;

  const statusTone: StatusTone = c.status === "approved" ? "success" : c.status === "rejected" ? "danger" : "warning";
  const statusLabel = t(`status.${c.status}` as "status.pending");
  const em = t("common.emptyValue");
  const linkCls = "font-semibold text-[var(--tint)] hover:underline";
  const siteHref = c.website ? (/^https?:\/\//.test(c.website) ? c.website : `https://${c.website}`) : null;

  // Maʼlumotlar — faqat toʻldirilgan maydonlar (boʻsh qatorlar bardoq qilmasin).
  const about: Fact[] = [
    { term: t("contractor.profile.status"), value: <Status tone={statusTone}>{statusLabel}</Status> },
    ...(c.rating ? [{ term: t("contractor.profile.rating"), value: `${c.rating} / 5` }] : []),
    ...(c.address ? [{ term: t("contractor.profile.address"), value: c.address }] : []),
    ...(siteHref
      ? [{
          term: t("contractor.profile.website"),
          value: (
            <a href={siteHref} target="_blank" rel="noreferrer" className={linkCls}>
              {c.website!.replace(/^https?:\/\//, "")}
            </a>
          ),
        }]
      : []),
    { term: t("contractor.profile.memberSince"), value: formatDate(c.createdAt as Date, locale) },
    { term: t("contractor.profile.nda"), value: c.ndaAcceptedAt ? formatDate(c.ndaAcceptedAt as Date, locale) : em },
    ...(c.registrationData
      ? [{ term: t("contractor.profile.registration"), value: <span className="whitespace-pre-line">{c.registrationData}</span> }]
      : []),
  ];

  const contact: Fact[] = [
    { term: t("contractor.profile.contactPerson"), value: c.contactPerson ?? em },
    ...(c.contactEmail
      ? [{ term: t("contractor.profile.email"), value: <a href={`mailto:${c.contactEmail}`} className={linkCls}>{c.contactEmail}</a> }]
      : []),
    ...(c.contactPhone
      ? [{ term: t("contractor.profile.phone"), value: <a href={`tel:${c.contactPhone}`} className={linkCls}>{c.contactPhone}</a> }]
      : []),
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 sm:gap-8">
      {/* Identifikatsiya kartasi */}
      <Card className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-2)]">
          {c.logoUrl ? (
            <SmoothImage src={c.logoUrl} alt={c.name} className="size-full object-contain p-2" />
          ) : (
            <span className="text-4xl font-black text-[var(--ink-3)]">{c.name.trim().charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex flex-col items-center gap-2.5">
          <Heading level={1} size="h1" align="center" className="break-words">{c.name}</Heading>
          {c.specialization && (
            <p className="max-w-sm text-sm font-medium text-[var(--muted)]">{c.specialization}</p>
          )}
          <Status tone={statusTone}>{statusLabel}</Status>
        </div>
      </Card>

      <Section title={t("contractor.profile.about")}>
        <Card>
          <FactList table items={about} />
        </Card>
      </Section>

      <Section title={t("contractor.profile.contact")}>
        <Card>
          <FactList table items={contact} />
        </Card>
      </Section>

      <DeveloperCard />
    </div>
  );
}
