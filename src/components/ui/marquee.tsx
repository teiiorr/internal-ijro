"use client";
import * as React from "react";

/**
 * Marquee text: occupies exactly the same box as a normal truncated label, but
 * when the text is wider than its container it scrolls horizontally on a loop
 * (like a ticker tape) so the whole thing can be read — without changing the
 * label's size or position by a single pixel. When it fits, it renders as a
 * plain truncated line (identical to `truncate`).
 *
 * A hidden, absolutely-positioned copy is measured against the container width;
 * a ResizeObserver re-measures on layout changes. Speed is constant (~20 px/s),
 * so short and long labels scroll at the same gentle, easy-to-read pace.
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

  const GAP = 40; // px between the two copies
  const style = scroll
    ? ({
        gap: `${GAP}px`,
        "--marquee-shift": `${width + GAP}px`,
        // ~20 px/s — half the old speed, comfortable to read; min 8s for short labels.
        "--marquee-duration": `${Math.max(8, (width + GAP) / 20)}s`,
      } as React.CSSProperties)
    : undefined;

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
      {/* Hidden measurer — natural text width, never affects layout. */}
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
