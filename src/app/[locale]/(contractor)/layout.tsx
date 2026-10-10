import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { externalCompanies, users } from "@/lib/db/schema";
import { getContractorUnreadCount } from "@/server/queries/projects";
import { SessionProvider } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { ContractorMobileNav } from "@/components/layout/contractor-mobile-nav";
import { AppFooter } from "@/components/layout/app-footer";
import { RouteProgress } from "@/components/layout/route-progress";
import { Card } from "@/components/ui-biib/Card";
import { Heading } from "@/components/ui-biib/Heading";
import { Status, type StatusTone } from "@/components/ui-biib/Status";
import {
  IconFolder as Folder,
  IconMessageCircle as MessageCircle,
  IconClipboardList as ClipboardList,
  IconSettings as Settings,
  IconLayoutDashboard as LayoutDashboard,
  IconCalendarClock as CalendarClock,
  IconCoins as Coins,
  IconFiles as Files,
} from "@tabler/icons-react";

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.position !== "kontragent") redirect("/dashboard");
  const t = await getTranslations();

  const [me] = await db.select({ avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, session.user.id)).limit(1);
  const company = await db.select({ name: externalCompanies.name, status: externalCompanies.status, rejectionReason: externalCompanies.rejectionReason, ndaAcceptedAt: externalCompanies.ndaAcceptedAt }).from(externalCompanies).where(eq(externalCompanies.contactEmail, session.user.email)).limit(1);
  if (company.length > 0 && company[0].status !== "approved") {
    const tone: StatusTone = company[0].status === "rejected" ? "danger" : company[0].status === "pending" ? "warning" : "neutral";
    return (
      <SessionProvider>
        <div className="min-h-screen flex flex-col">
          <Header userName={company.length > 0 ? company[0].name : session.user.fullName} avatarUrl={me?.avatarUrl} rawName />
          <main className="flex-1 flex items-center justify-center p-6">
            <Card className="max-w-md text-center">
              <Heading level={1} size="h2" align="center">{t("contractor.accountUnderReview")}</Heading>
              <p className="mt-3 t-small text-[var(--ink-2)]">{t("contractor.applicationStatus")}</p>
              <div className="mt-3 flex justify-center">
                <Status tone={tone}>{t(`status.${company[0].status}` as "status.pending")}</Status>
              </div>
              {company[0].rejectionReason && (
                <p className="mt-4 t-small text-[var(--ink-2)]">{t("contractor.reason")}: {company[0].rejectionReason}</p>
              )}
            </Card>
          </main>
        </div>
      </SessionProvider>
    );
  }
  if (company.length > 0 && !company[0].ndaAcceptedAt) {
    redirect("/contractor-nda");
  }

  // Studiya portali boʻlimlari: bosh sahifa, ish (loyihalar/vazifalar), muloqot,
  // muddatlar, toʻlovlar va hujjatlar. Profil — avatar menyusida va mobil "Koʻproq" varagʻida.
  const NAV = [
    { href: "/contractor/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
    { href: "/contractor/projects", icon: Folder, label: t("nav.projects") },
    { href: "/contractor/tasks", icon: ClipboardList, label: t("nav.tasks") },
    { href: "/contractor/chats", icon: MessageCircle, label: t("nav.chats") },
    { href: "/contractor/deadlines", icon: CalendarClock, label: t("nav.deadlines") },
    { href: "/contractor/payments", icon: Coins, label: t("nav.payments") },
    { href: "/contractor/documents", icon: Files, label: t("nav.documents") },
    { href: "/contractor/settings", icon: Settings, label: t("nav.settings") },
  ];
  const menuLinks = [{ href: "/contractor/profile", label: t("nav.profile") }];
  const unread = await getContractorUnreadCount(session.user.id);

  return (
    <SessionProvider>
      <RouteProgress />
      {/* overflow-x-clip: hujjat kengligi hech qachon ekrandan oshmaydi (sticky buzilmaydi). */}
      <div className="min-h-screen flex flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0 relative overflow-x-clip">
        <Header userName={company.length > 0 ? company[0].name : session.user.fullName} avatarUrl={me?.avatarUrl} rawName menuLinks={menuLinks} />
        <div className="flex flex-1 max-w-[1500px] w-full mx-auto">
          <aside className="hidden md:block w-[272px] shrink-0">
            <Card bare className="sticky top-[88px] m-4 p-2">
              <nav className="space-y-0.5">
                {NAV.map(({ href, icon: Icon, label }) => (
                  <Link key={href} href={href} className="flex items-center gap-3 rounded-[var(--radius-control)] px-4 h-11 t-label text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors">
                    <Icon className="size-5 shrink-0" /> <span className="flex-1 truncate">{label}</span>
                    {href === "/contractor/chats" && unread > 0 && (
                      <span className="shrink-0 t-micro font-bold tabular-nums text-[var(--tint)]">{unread > 99 ? "99+" : unread}</span>
                    )}
                  </Link>
                ))}
              </nav>
            </Card>
          </aside>
          <main className="flex-1 px-3 sm:px-4 md:px-6 lg:px-8 py-5 sm:py-6 md:py-8 min-w-0 flex flex-col">
            <div className="flex-1">{children}</div>
            <AppFooter />
          </main>
        </div>
        <ContractorMobileNav unread={unread} />
      </div>
    </SessionProvider>
  );
}
