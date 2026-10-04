"use client";
import { useEffect, useRef } from "react";
import { markAnnouncementRead } from "@/server/actions/announcements";

/**
 * Batafsil sahifa ochilganda eʼlonni "koʻrildi" deb belgilaydi (bir marta).
 * Hech narsa chizmaydi; xatolar jimgina eʼtiborsiz qoldiriladi.
 */
export function MarkRead({ id }: { id: string }) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === id) return;
    sent.current = id;
    markAnnouncementRead(id).catch(() => {});
  }, [id]);
  return null;
}
