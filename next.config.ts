import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // standalone copies only what's needed into .next/standalone for prod.
  // Pair with `cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public`
  // in the deploy script so node .next/standalone/server.js boots cleanly.
  output: "standalone",
  // App stays behind nginx; trust the X-Forwarded-* headers it sets.
  poweredByHeader: false,
  // Trim the client bundle: rewrite barrel imports from these big libs into
  // direct per-module imports so only what's used ships. lucide-react / date-fns
  // are in Next's default list; recharts (dashboard charts) is not, so it matters
  // most here.
  serverExternalPackages: ["exceljs", "@react-pdf/renderer", "rimraf"],
  experimental: {
    optimizePackageImports: ["recharts", "date-fns", "@tabler/icons-react"],
    // Server Actions buffer the ENTIRE request body in memory before our code
    // runs — dangerous on the 2GB production box (shared with Postgres), where a
    // big buffered upload can trip the OOM killer. So large files DON'T go through
    // Server Actions: stage-document uploads stream straight to disk via the route
    // handler at /api/files/stage-docs (constant memory). This limit only covers
    // the remaining small Server-Action uploads (posters, short attachments); keep
    // it modest so nothing buffers tens of MB in RAM.
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' ws: wss:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
