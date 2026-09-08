import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Ichki Ijro",
  description: "Corporate task, project and HR management",
};

// viewportFit:'cover' is required for env(safe-area-inset-*) to resolve to real
// values on notched phones — without it every safe-area inset is 0.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F5FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0E1A" },
  ],
};

// Root layout must just pass through — locale layout is responsible for <html>/<body>.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
