import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies, users } from "@/lib/db/schema";
import { SessionProvider } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { ContractorMobileNav } from "@/components/layout/contractor-mobile-nav";
import { AppFooter } from "@/components/layout/app-footer";
import { RouteProgress } from "@/components/layout/route-progress";
import { IconFolder as Folder, IconLayoutDashboard as LayoutDashboard, IconMessageCircle as MessageCircle, IconUser as UserIcon, IconSettings as Settings, IconFileText as FileText } from "@tabler/icons-react";

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.position !== "kontragent") redirect("/dashboard");
  const t = await getTranslations();

  const [me] = await db.select({ avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, session.user.id)).limit(1);
  const company = await db.select({ name: externalCompanies.name, status: externalCompanies.status, rejectionReason: externalCompanies.rejectionReason, ndaAcceptedAt: externalCompanies.ndaAcceptedAt }).from(externalCompanies).where(eq(externalCompanies.contactEmail, session.user.email)).limit(1);
  if (company.length > 0 && company[0].status !== "approved") {
    return (
      <SessionProvider>
        <div className="min-h-screen flex flex-col">
          <Header userName={company.length > 0 ? company[0].name : session.user.fullName} avatarUrl={me?.avatarUrl} rawName />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md text-center space-y-4 glass-strong rounded-3xl p-8">
              <h1 className="text-2xl font-extrabold tracking-tight gradient-text">{t("contractor.accountUnderReview")}</h1>
              <p className="text-sm text-[var(--muted)] font-medium">
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
    { href: "/contractor/chats", icon: MessageCircle, label: t("nav.chats") },
    { href: "/contractor/profile", icon: UserIcon, label: t("nav.profile") },
    { href: "/notifications", icon: FileText, label: t("nav.notifications") },
    { href: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  return (
    <SessionProvider>
      <RouteProgress />
      <div className="min-h-screen flex flex-col pb-24 md:pb-0 relative">
        <Header userName={company.length > 0 ? company[0].name : session.user.fullName} avatarUrl={me?.avatarUrl} rawName />
        <div className="flex flex-1 max-w-[1500px] w-full mx-auto">
          <aside className="hidden md:block w-[272px] shrink-0">
            <div className="sticky top-[88px] m-4 p-3 rounded-3xl glass-strong">
              <p className="px-3 py-2 text-xs text-[var(--muted)] font-semibold">{t("contractor.portalLabel")}</p>
              <nav className="space-y-1">
                {NAV.map(({ href, icon: Icon, label }) => (
                  <Link key={href} href={href} className="flex items-center gap-3 rounded-2xl px-4 h-12 text-[15px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--glass-fill)] transition-colors">
                    <Icon className="size-5" /> {label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
          <main className="flex-1 px-3 sm:px-4 md:px-6 lg:px-8 py-5 sm:py-6 md:py-8 min-w-0 flex flex-col">
            <div className="flex-1">{children}</div>
            <AppFooter />
          </main>
        </div>
        <ContractorMobileNav />
      </div>
    </SessionProvider>
  );
}
