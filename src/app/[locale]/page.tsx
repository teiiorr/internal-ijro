import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";

/**
 * Root → töğridan-töğri login sahifasiga (yoki tizimga allaqaçon kirilgan bölsa, mos bosh sahifaga).
 * Marketing lendingi yöq; bu içki vosita. next-intl'ning redirect'idan foydalanadi,
 * şunda lokal prefiksi boşidan oxirigaça saqlanib qoladi.
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
