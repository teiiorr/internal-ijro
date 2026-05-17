import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
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

  const company = await db.select().from(externalCompanies).where(eq(externalCompanies.contactEmail, session.user.email)).limit(1);
  if (company.length > 0 && company[0].status !== "approved") {
    return (
      <SessionProvider>
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
          <Header userName={session.user.fullName} />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md text-center space-y-3">
              <h1 className="text-2xl font-bold">Account under review</h1>
              <p className="text-sm text-[var(--muted)]">
                Your contractor application status: <strong>{company[0].status}</strong>.
                {company[0].rejectionReason && <span> Reason: {company[0].rejectionReason}</span>}
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
    { href: "/contractor/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/contractor/projects", icon: Folder, label: "Projects" },
    { href: "/contractor/profile", icon: UserIcon, label: "Profile" },
    { href: "/notifications", icon: FileText, label: "Notifications" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col bg-[var(--background)]">
        <Header userName={session.user.fullName} />
        <div className="flex flex-1">
          <aside className="hidden md:flex flex-col w-64 border-r bg-[var(--background-elevated)] p-3">
            <p className="px-3 py-2 text-xs uppercase text-[var(--muted)]">Contractor portal</p>
            <nav className="space-y-1">
              {NAV.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[var(--accent)]">
                  <Icon className="size-4" /> {label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
