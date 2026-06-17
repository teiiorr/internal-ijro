import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SessionProvider } from "next-auth/react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.position === "kontragent") redirect("/contractor/dashboard");

  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col pb-24 md:pb-0">
        <Header userName={session.user.fullName} />
        <div className="flex flex-1 max-w-[1500px] w-full mx-auto">
          <Sidebar position={session.user.position} />
          <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 md:py-8 min-w-0">{children}</main>
        </div>
        <MobileNav />
      </div>
    </SessionProvider>
  );
}
