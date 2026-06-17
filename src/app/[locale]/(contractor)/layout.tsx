import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies } from "@/lib/db/schema";
import { SessionProvider } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { Folder, LayoutDashboard, User as UserIcon, Settings, FileText } from "lucide-react";

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.position !== "kontragent") redirect("/dashboard");
  const t = await getTranslations();

  const company = await db.select().from(externalCompanies).where(eq(externalCompanies.contactEmail, session.user.email)).limit(1);
  if (company.length > 0 && company[0].status !== "approved") {
    return (
      <SessionProvider>
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
          <Header userName={session.user.fullName} />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md text-center space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-7">
              <h1 className="text-xl font-semibold tracking-tight">{t("contractor.accountUnderReview")}</h1>
              <p className="text-sm text-[var(--muted)]">
                {t("contractor.applicationStatus")}: <strong className="text-[var(--foreground)]">{t(`status.${company[0].status}` as "status.pending")}</strong>.
                {company[0].rejectionReason && <span> {t("contractor.reason")}: {company[0].rejectionReason}</span>}
              </p>
            </div>
          </main>
        </div>
      </SessionProvider>
    );
  }
  if (company.length > 0 && !company[0].ndaAcceptedAt) {
    redirect("/contractor-nda");
  }

  const NAV = [
    { href: "/contractor/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
    { href: "/contractor/projects", icon: Folder, label: t("nav.projects") },
    { href: "/contractor/profile", icon: UserIcon, label: t("nav.profile") },
    { href: "/notifications", icon: FileText, label: t("nav.notifications") },
    { href: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col bg-[var(--background)]">
        <Header userName={session.user.fullName} />
        <div className="flex flex-1">
          <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[var(--border)]">
            <div className="sticky top-14 py-5 px-3">
              <p className="px-3 py-2 text-[11px] uppercase tracking-widest text-[var(--muted)] font-semibold">{t("contractor.portalLabel")}</p>
              <nav className="space-y-0.5">
                {NAV.map(({ href, icon: Icon, label }) => (
                  <Link key={href} href={href} className="flex items-center gap-3 rounded-md px-3 h-9 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors">
                    <Icon className="size-4" /> {label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
          <main className="flex-1 px-5 md:px-8 py-6 md:py-8 max-w-[1280px] mx-auto w-full">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
