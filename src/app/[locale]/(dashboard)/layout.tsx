import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { SessionProvider } from "next-auth/react";
import { CommandPalette } from "@/components/command-palette";

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
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
        <CommandPalette />
      </div>
    </SessionProvider>
  );
}
