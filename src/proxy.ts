import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register-contractor",
  "/forgot-password",
  "/reset-password",
  "/setup",
  "/invite",
];

function stripLocale(pathname: string): string {
  for (const loc of routing.locales) {
    if (pathname === `/${loc}`) return "/";
    if (pathname.startsWith(`/${loc}/`)) return pathname.slice(loc.length + 1);
  }
  return pathname;
}

/** URL boshidagi til prefiksini qaytaradi (yoʻq boʻlsa — null). */
function getUrlLocale(pathname: string): string | null {
  for (const loc of routing.locales) {
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) return loc;
  }
  return null;
}

function isPublic(pathname: string): boolean {
  const p = stripLocale(pathname);
  if (p === "/") return true;
  return PUBLIC_PATHS.some((pub) => p === pub || p.startsWith(`${pub}/`));
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/uploads/") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const xff = req.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
  const isPrivate =
    ip === "anon" || ip === "127.0.0.1" || ip === "::1" ||
    ip.startsWith("10.") || ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip);

  const sessionCookie =
    req.cookies.get("authjs.session-token")?.value ??
    req.cookies.get("__Secure-authjs.session-token")?.value;

  // Rate limiting (IP böyiça). MUHIM: butun ofis BITTA ommaviy IP (NAT) ortida
  // turadi, şuning uçun IP böyiça past çegara bir neça kişi faollaşişi bilanoq
  // hammani noörin 429 qiladi — har bir sahifa yuklanişida köplab RSC + prefetch
  // sörovlar hamda 60s'lik bildirişnoma polling'i keladi, 40 ta foydalanuvçi esa
  // bitta bucket'ni ulaşadi. Şuning uçun:
  //  • auth endpoint'lar (login/forgot/reset): brute force'ga qarşi IP böyiça qat'iy çegara
  //    (buni akkaunt böyiça bloklaş ham quvvatlaydi);
  //  • boşqa yöllarga anonim trafik: keng (saxovatli) çegara;
  //  • autentifikatsiyadan ötgan foydalanuvçilar (haqiqiy sessiya): faqat juda yuqori
  //    himoya çegarasi — ular işonçli içki xodimlar va umumiy IP tufayli bloklanmasligi kerak.
  if (!isPrivate) {
    const isAuthEndpoint =
      pathname.includes("/login") || pathname.includes("/forgot-password") || pathname.includes("/reset-password");
    const rl = isAuthEndpoint
      ? rateLimit(`auth:${ip}`, 120, 60_000)
      : sessionCookie
        ? rateLimit(`user:${ip}`, 20_000, 60_000)
        : rateLimit(`anon:${ip}`, 600, 60_000);
    if (!rl.allowed) {
      return new NextResponse("too_many_requests", { status: 429, headers: { "Retry-After": "60" } });
    }
  }

  if (!isPublic(pathname) && !sessionCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Tilni "eslab qolish": foydalanuvchi tanlagan til (NEXT_LOCALE kukisi) URL'dagi
  // tildan farq qilsa — tanlangan tilga yoʻnaltiramiz. Shu bilan til bir marta
  // tasdiqlangach, foydalanuvchi oʻzgartirmaguncha HAMMA yerda saqlanadi (standart
  // uz-latn yoki boshqa havola uni buza olmaydi). Tanlov faqat til almaştirgiç orqali
  // oʻzgaradi (u kukini sinxron yozadi, şu sabab bu yerda sakrab ketmaydi).
  const prefCookie = req.cookies.get("NEXT_LOCALE")?.value;
  const pref = prefCookie && (routing.locales as readonly string[]).includes(prefCookie) ? prefCookie : null;
  const urlLocale = getUrlLocale(pathname);
  if (pref && urlLocale && urlLocale !== pref) {
    const rest = pathname.slice(1 + urlLocale.length); // "/dashboard" yoki ""
    const url = new URL(`/${pref}${rest}${req.nextUrl.search}`, req.url);
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
