import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Root → straight to login (or to the appropriate home if already signed in).
 * No marketing landing; this is an internal tool.
 */
export default async function IndexPage() {
  const session = await auth();
  if (session?.user) {
    if (session.user.position === "kontragent") redirect("/contractor/dashboard");
    redirect("/dashboard");
  }
  redirect("/login");
}
