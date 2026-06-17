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
        <div className="min-h-screen flex flex-col">
          <Header userName={session.user.fullName} />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md text-center space-y-4 rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-fill-strong)] backdrop-blur-2xl backdrop-saturate-180 p-8 shadow-[0_8px_28px_-6px_rgba(31,38,135,0.1)]">
              <h1 className="font-display text-2xl font-bold tracking-tight">{t("contractor.accountUnderReview")}</h1>
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
      <div className="min-h-screen flex flex-col">
        <Header userName={session.user.fullName} />
        <div className="flex flex-1">
          <aside className="hidden md:flex flex-col w-64 p-4">
            <div className="rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-fill)] backdrop-blur-xl backdrop-saturate-180 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_28px_-6px_rgba(31,38,135,0.08)] sticky top-[88px]">
              <p className="px-3 py-2 text-xs uppercase tracking-widest text-[var(--muted)] font-semibold">{t("contractor.portalLabel")}</p>
              <nav className="space-y-1">
                {NAV.map(({ href, icon: Icon, label }) => (
                  <Link key={href} href={href} className="flex items-center gap-3 rounded-2xl px-3 h-12 text-[15px] font-medium hover:bg-[var(--surface-2)] transition-colors">
                    <Icon className="size-5" /> {label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
          <main className="flex-1 p-4 md:p-6 max-w-[1500px]">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
