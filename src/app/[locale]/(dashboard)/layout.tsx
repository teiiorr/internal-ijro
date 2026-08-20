import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { isOwner } from "@/lib/permissions/owner";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AppFooter } from "@/components/layout/app-footer";
import { SessionProvider } from "next-auth/react";
import { RouteProgress } from "@/components/layout/route-progress";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.position === "kontragent") redirect("/contractor/dashboard");
  const owner = isOwner(session.user.email);
  const [me] = await db.select({ avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, session.user.id)).limit(1);

  return (
    <SessionProvider>
      <RouteProgress />
      <div className="min-h-screen flex flex-col pb-24 md:pb-0 relative">
        <Header userName={session.user.fullName} avatarUrl={me?.avatarUrl} />
        <div className="flex flex-1 max-w-[1500px] w-full mx-auto">
          <Sidebar position={session.user.position} userId={session.user.id} isOwner={owner} />
          <main className="flex-1 px-3 sm:px-4 md:px-6 lg:px-8 py-5 sm:py-6 md:py-8 min-w-0 flex flex-col">
            <div className="flex-1">{children}</div>
            <AppFooter />
          </main>
        </div>
        <MobileNav position={session.user.position} userId={session.user.id} isOwner={owner} />
      </div>
    </SessionProvider>
  );
}
