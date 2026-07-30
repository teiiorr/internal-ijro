"use client";
import * as React from "react";

/**
 * Renders text on a single line and shrinks the font-size (between minPx and
 * maxPx) until it fits its parent's width — never wraps. Used for large money
 * figures in narrow cards so "… UZS" stays on one line beside its label.
 * The parent element must have a bounded width (e.g. flex-1 min-w-0).
 */
export function FitText({
  children,
  className,
  maxPx = 14,
  minPx = 10,
}: {
  children: React.ReactNode;
  className?: string;
  maxPx?: number;
  minPx?: number;
}) {
  const spanRef = React.useRef<HTMLSpanElement>(null);
  const [px, setPx] = React.useState(maxPx);

  React.useLayoutEffect(() => {
    const span = spanRef.current;
    const box = span?.parentElement;
    if (!span || !box) return;
    const fit = () => {
      let size = maxPx;
      span.style.fontSize = `${size}px`;
      let guard = 0;
      while (span.scrollWidth > box.clientWidth && size > minPx && guard < 60) {
        size -= 0.5;
        span.style.fontSize = `${size}px`;
        guard++;
      }
      setPx(size);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [children, maxPx, minPx]);

  return (
    <span ref={spanRef} className={className} style={{ fontSize: px, whiteSpace: "nowrap", display: "inline-block" }}>
      {children}
    </span>
  );
}
