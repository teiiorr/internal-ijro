"use client";
import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Oyna ortidagi kontent tusini aniqlab, yorliq rangini moslaydi (qorongʻi rasm ustida oq).
 * Hozircha no-op: faqat `adaptiveTone` yoqilgan sirtlar (hero, rasm ustidagi oyna) uchun kerak,
 * ular pardozlash bosqichida to'liq ulanadi. Oddiy sirtlar materials.css tokenlaridan oʻqiydi.
 */
export function useSurfaceTone(_ref: RefObject<HTMLElement | null>, _adaptive: boolean): void {
  useEffect(() => {
    // pardozlash bosqichida: IntersectionObserver + kontent yorqinligi tahlili.
  }, []);
}
