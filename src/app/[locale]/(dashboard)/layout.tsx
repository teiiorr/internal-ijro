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
      <div className="min-h-screen flex flex-col bg-[var(--background)] pb-20 md:pb-0">
        <Header userName={session.user.fullName} />
        <div className="flex flex-1 w-full">
          <Sidebar position={session.user.position} />
          <main className="flex-1 px-5 md:px-8 lg:px-10 py-6 md:py-8 min-w-0 max-w-[1280px] mx-auto w-full">{children}</main>
        </div>
        <MobileNav />
      </div>
    </SessionProvider>
  );
}
