"use server";
import { auth } from "@/lib/auth";
import { signDocToken } from "@/lib/smeta-docs/token";
import manifest from "@/data/smeta-docs.json";

// Manifestdagi haqiqiy fayl id'lari — token faqat shular uchun beriladi.
const IDS = new Set(
  (manifest as { items: { files: { id: string }[] }[] }).items.flatMap((i) => i.files.map((f) => f.id))
);

/**
 * "Word'da ochish" uchun imzolangan token. Faqat tizimga kirgan ichki xodimga
 * (studiyalarga emas) va faqat mavjud fayl uchun beriladi. null — ruxsat yoʻq.
 */
export async function signSmetaDocForWord(id: string): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id || session.user.position === "kontragent") return null;
  if (!IDS.has(id)) return null;
  return signDocToken(id);
}
