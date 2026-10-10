"use client";

import { useEffect } from "react";

/**
 * Tap tovushi — yumshoq, xotirjam "tomchi" (660→440 Hz sine glide, past ovoz, ~0.18s).
 * Faqat interaktiv elementlarda (tugma, havola, nav, checkbox) chalinadi, debounce bilan,
 * bezovta qilmaydi. localStorage "ijro_tap_sound"="off" bilan oʻchiriladi. Birinchi
 * foydalanuvchi harakatidan keyin AudioContext yaratiladi (autoplay siyosati).
 */
export function TapSound() {
  useEffect(() => {
    let enabled = true;
    try {
      enabled = localStorage.getItem("ijro_tap_sound") !== "off";
    } catch {
      /* ignore */
    }
    if (!enabled) return;

    type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };
    let ctx: AudioContext | null = null;
    const getCtx = (): AudioContext | null => {
      if (!ctx) {
        const Ctor = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
        if (!Ctor) return null;
        try {
          ctx = new Ctor();
        } catch {
          return null;
        }
      }
      if (ctx.state === "suspended") void ctx.resume().catch(() => {});
      return ctx;
    };

    const play = () => {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(432, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.055, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.connect(gain).connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    };

    const INTERACTIVE = 'button, a[href], [role="button"], .ui-button, label, summary, input[type="checkbox"], input[type="radio"], [data-tap-sound]';
    let last = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const t = e.timeStamp;
      if (t - last < 60) return;
      const el = e.target as Element | null;
      if (!el || !el.closest(INTERACTIVE)) return;
      last = t;
      play();
    };

    document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    return () => document.removeEventListener("pointerdown", onDown, { capture: true });
  }, []);

  return null;
}
