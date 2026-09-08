"use client";
import * as React from "react";

/**
 * Yuguruvçi matn: oddiy qisqartirilgan yorliq bilan aynan bir xil joyni egallaydi,
 * biroq matn konteynerdan kengroq bölsa, uni butunligicha öqiş mumkin bölsin deb
 * gorizontal ravişda halqa böylab suriladi (yugurar satr kabi) — yorliqning ölçami
 * yoki örnini bir piksel ham özgartirmasdan. Matn siğsa, oddiy qisqartirilgan satr
 * sifatida çiqadi (`truncate` bilan bir xil).
 *
 * Yaşirin, absolyut joylaştirilgan nusxa konteyner kengligiga soliştiriladi;
 * ResizeObserver esa layout özgarişlarida uni qayta ölçaydi. Tezlik doimiy (~20 px/s),
 * şuning uçun qisqa va uzun yorliqlar bir xil yumşoq, öqişga qulay sur'atda suriladi.
 */
export function Marquee({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLSpanElement>(null);
  const [scroll, setScroll] = React.useState(false);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const meas = measureRef.current;
    if (!wrap || !meas) return;
    const measure = () => {
      const textW = meas.offsetWidth;
      const boxW = wrap.clientWidth;
      if (textW > boxW + 2) {
        setWidth(textW);
        setScroll(true);
      } else {
        setScroll(false);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [children]);

  const GAP = 40; // ikki nusxa orasidagi masofa (px)
  const style = scroll
    ? ({
        gap: `${GAP}px`,
        "--marquee-shift": `${width + GAP}px`,
        // ~20 px/s — avvalgi tezlikning yarmi, öqişga qulay; qisqa yorliqlar uçun kamida 8s.
        "--marquee-duration": `${Math.max(8, (width + GAP) / 20)}s`,
      } as React.CSSProperties)
    : undefined;

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
      {/* Yaşirin ölçagiç — matnning tabiiy kengligini oladi, layoutga hiç ta'sir qilmaydi. */}
      <span ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap">
        {children}
      </span>
      {scroll ? (
        <div className="flex w-max whitespace-nowrap animate-marquee" style={style}>
          <span>{children}</span>
          <span aria-hidden>{children}</span>
        </div>
      ) : (
        <span className="block truncate">{children}</span>
      )}
    </div>
  );
}
