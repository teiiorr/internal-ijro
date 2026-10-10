"use client";

import { createContext, useContext } from "react";

export type SurfaceRadius = "control" | "panel" | "sheet" | "round";

export interface SurfaceFrame {
  /** CSS ifodasi: ichki sirt oʻz radiusini shundan hisoblaydi. */
  readonly radius: string;
  readonly padding: number;
}

export const SurfaceContext = createContext<SurfaceFrame | null>(null);

export function useParentSurface(): SurfaceFrame | null {
  return useContext(SurfaceContext);
}

/* Kapsula faqat 48 px gacha: undan baland boshqaruvda radius 24 px da toʻxtaydi. */
export const RADIUS_EXPRESSION: Record<SurfaceRadius, string> = {
  control: "min(var(--radius-control), 24px)",
  panel: "var(--radius-panel)",
  sheet: "var(--radius-panel)",
  /* Faqat kvadrat boshqaruv uchun (media ijro tugmasi). */
  round: "50%",
};

/** Konsentrik qoida: ichki radius = tashqi radius − padding, kamida --radius-s. */
export function innerRadius(frame: SurfaceFrame): string {
  return `max(var(--radius-s), calc(${frame.radius} - ${frame.padding}px))`;
}
