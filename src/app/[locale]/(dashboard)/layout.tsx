import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { SessionProvider } from "next-auth/react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.position === "kontragent") redirect("/contractor/dashboard");

  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col bg-[var(--background)]">
        <Header userName={session.user.fullName} />
        <div className="flex flex-1">
          <Sidebar position={session.user.position} />
          <main className="flex-1 px-4 md:px-8 lg:px-10 py-6 md:py-8 max-w-[1400px] w-full">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
