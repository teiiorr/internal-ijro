"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

export function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevPath = useRef(pathname);

  const start = useCallback(() => {
    setProgress(0);
    setVisible(true);
    let p = 0;
    const tick = () => {
      p += Math.random() * 15 + 5;
      if (p > 90) p = 90;
      setProgress(p);
      timer.current = setTimeout(tick, 200 + Math.random() * 300);
    };
    tick();
  }, []);

  const done = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }, []);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      done();
      prevPath.current = pathname;
    }
  }, [pathname, done]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || anchor.target === "_blank") return;
      start();
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [start]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px]">
      <div
        className="h-full bg-[var(--primary)] transition-[width] duration-200 ease-out rounded-r-full shadow-[0_0_8px_var(--primary)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
