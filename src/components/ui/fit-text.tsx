"use client";
import * as React from "react";

/**
 * Matnni bitta qatorda körsatadi va u ota elementning kengligiga siğgunça
 * font-size ni (minPx va maxPx orasida) kiçraytiradi — hech qaçon yangi satrga
 * ötmaydi. Tor kartalardagi katta pul summalari uçun işlatiladi, şunda "… UZS"
 * öz yorliği yonida bitta qatorda turadi. Ota element çegaralangan kenglikka
 * ega bölişi kerak (masalan, flex-1 min-w-0).
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
