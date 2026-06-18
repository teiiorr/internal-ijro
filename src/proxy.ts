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

  // Rate limiting (per IP). Tuned for an internal corporate tool with ~40 users.
  // Single page loads trigger many subordinate requests (RSC fetches, prefetches,
  // i18n re-renders) — 5/min was eating real users on the first /login open.
  // Skip RL entirely for loopback/private-network clients (server-side renders,
  // localhost SSR, internal probes) so localhost calls during smoke tests pass.
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
  const isPrivate =
    ip === "anon" || ip === "127.0.0.1" || ip === "::1" ||
    ip.startsWith("10.") || ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
  if (!isPrivate) {
    const isAuth = pathname.includes("/login") || pathname.includes("/forgot-password") || pathname.includes("/reset-password");
    const rl = isAuth ? rateLimit(`auth:${ip}`, 30, 60_000) : rateLimit(`pg:${ip}`, 600, 60_000);
    if (!rl.allowed) {
      return new NextResponse("too_many_requests", { status: 429, headers: { "Retry-After": "60" } });
    }
  }

  if (!isPublic(pathname)) {
    const sessionCookie =
      req.cookies.get("authjs.session-token")?.value ??
      req.cookies.get("__Secure-authjs.session-token")?.value;
    if (!sessionCookie) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
