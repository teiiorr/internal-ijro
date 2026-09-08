import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { IconUser as UserIcon, IconMail as Mail, IconPhone as Phone, IconShieldCheck as Shield, IconTag as Tag, IconChevronRight as Chevron, IconPalette as Palette, IconLanguage as Lang } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies } from "@/lib/db/schema";
import { SmoothImage } from "@/components/ui/smooth-image";
import { StatusTag, type StatusTone } from "@/components/ui/status-tag";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { formatDate } from "@/lib/dates";

export default async function ContractorProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations();
  const locale = await getLocale();
  const rows = await db.select().from(externalCompanies).where(eq(externalCompanies.contactEmail, session.user.email)).limit(1);
  const c = rows[0];
  if (!c) return <p className="py-16 text-center text-sm text-[var(--muted)]">{t("contractor.profile.noCompany")}</p>;

  const statusTone: StatusTone = c.status === "approved" ? "green" : c.status === "rejected" ? "red" : "amber";

  const Row = ({ icon: Icon, label, value, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; href?: string }) => {
    const inner = (
      <>
        <Icon className="size-5 shrink-0 text-[var(--muted)]" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--muted)]">{label}</p>
          <p className="truncate text-sm font-semibold">{value}</p>
        </div>
        {href && <Chevron className="size-4 shrink-0 text-[var(--subtle)]" />}
      </>
    );
    const cls = "flex items-center gap-3 px-4 py-3";
    return href ? <a href={href} className={`${cls} transition-colors active:bg-[var(--glass-fill)] hover:bg-[var(--glass-fill)]`}>{inner}</a> : <div className={cls}>{inner}</div>;
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {/* Company header */}
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <div className="grid size-20 place-items-center overflow-hidden rounded-3xl bg-[var(--surface-2)] ring-1 ring-[var(--border)]">
          {c.logoUrl ? (
            <SmoothImage src={c.logoUrl} alt={c.name} className="size-full object-contain p-1.5" />
          ) : (
            <span className="text-3xl font-black text-[var(--subtle)]">{c.name.trim().charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{c.name}</h1>
          <div className="mt-1.5 flex justify-center"><StatusTag tone={statusTone} size="sm">{t(`status.${c.status}` as "status.pending")}</StatusTag></div>
        </div>
      </div>

      {/* Contact — grouped inset list */}
      <div>
        <p className="mb-1.5 px-4 text-xs font-semibold uppercase tracking-wide text-[var(--subtle)]">{t("contractor.profile.contact")}</p>
        <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <Row icon={UserIcon} label={t("contractor.profile.contactPerson")} value={c.contactPerson ?? "—"} />
          {c.contactEmail && <Row icon={Mail} label={t("contractor.profile.email")} value={c.contactEmail} href={`mailto:${c.contactEmail}`} />}
          {c.contactPhone && <Row icon={Phone} label={t("contractor.profile.phone")} value={c.contactPhone} href={`tel:${c.contactPhone}`} />}
          {c.specialization && <Row icon={Tag} label={t("contractor.profile.specialization")} value={c.specialization} />}
          <Row icon={Shield} label={t("contractor.profile.nda")} value={c.ndaAcceptedAt ? `✓ ${formatDate(c.ndaAcceptedAt as Date, locale)}` : "—"} />
        </div>
      </div>

      {/* Appearance — theme + language */}
      <div>
        <p className="mb-1.5 px-4 text-xs font-semibold uppercase tracking-wide text-[var(--subtle)]">{t("contractor.profile.appearance")}</p>
        <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <Palette className="size-5 shrink-0 text-[var(--muted)]" />
            <span className="flex-1 text-sm font-semibold">{t("contractor.profile.theme")}</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5">
            <Lang className="size-5 shrink-0 text-[var(--muted)]" />
            <span className="flex-1 text-sm font-semibold">{t("contractor.profile.language")}</span>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}
