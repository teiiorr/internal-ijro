import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";

/**
 * Root → straight to login (or to the appropriate home if already signed in).
 * No marketing landing; this is an internal tool. Uses next-intl's redirect
 * so the locale prefix is preserved end-to-end.
 */
export default async function IndexPage() {
  const session = await auth();
  const locale = (await getLocale()) as AppLocale;
  if (session?.user) {
    if (session.user.position === "kontragent") {
      redirect({ href: "/contractor/dashboard", locale });
    }
    redirect({ href: "/dashboard", locale });
  }
  redirect({ href: "/login", locale });
}
