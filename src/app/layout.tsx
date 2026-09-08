import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Ichki Ijro",
  description: "Corporate task, project and HR management",
};

// viewportFit:'cover' env(safe-area-inset-*) qiymatlari notchli telefonlarda
// haqiqiy qiymatga aylanişi uçun kerak — usiz har bir safe-area inset 0 böladi.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F5FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0E1A" },
  ],
};

// Root layout shunçaki ötkazib yuborişi kerak — <html>/<body> uçun locale layout javobgar.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
