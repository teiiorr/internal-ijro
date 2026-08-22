"use client";
import { useState, useRef, useEffect } from "react";

export function SmoothImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // Cached images can complete before onLoad is attached — detect on mount so
  // the image doesn't stay stuck at opacity-0.
  useEffect(() => {
    setLoaded(false);
    const el = ref.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, [src]);

  return (
    <>
      {!loaded && <div className="absolute inset-0 skeleton-shimmer" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`${className ?? ""} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
      />
    </>
  );
}
