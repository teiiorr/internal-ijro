import type { Metadata } from "next";
import { MaintenanceScreen } from "@/components/maintenance-screen";

export const metadata: Metadata = { title: "Texnik ishlar — Markaz Ijro", robots: { index: false } };

// Texnik rejim sahifasi — egadan boshqa hamma shu yerga yoʻnaltiriladi (dashboard/contractor
// layout'larida). Hech qanday navigatsiya/autentifikatsiya talab qilinmaydi (public).
export default function TexnikPage() {
  return <MaintenanceScreen />;
}
