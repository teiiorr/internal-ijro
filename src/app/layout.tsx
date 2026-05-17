import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ichki Ijro",
  description: "Corporate task, project and HR management",
};

// Root layout must just pass through — locale layout is responsible for <html>/<body>.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
