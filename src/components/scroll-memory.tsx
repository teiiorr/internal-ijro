"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Remembers the window scroll position for the current URL and restores it when
 * the user comes back — e.g. scrolls the project list, opens a project, then
 * returns (browser back, the Android hardware back, or an in-app "back" link).
 *
 * Keyed by the live URL (path + query, read from window.location), so each
 * filtered/tab view keeps its own position; scoped to sessionStorage so it
 * resets when the tab closes. Renders nothing. Uses only usePathname (no
 * useSearchParams), so it needs no Suspense boundary.
 *
 * Relies on the list having a stable height on mount (the project grid uses
 * fixed aspect-ratio cards), so the saved offset is valid before images load.
 */
export function ScrollMemory() {
  const pathname = usePathname(); // re-arm the effect whenever the route changes

  useEffect(() => {
    const keyOf = () => `scroll:${window.location.pathname}${window.location.search}`;

    // Restore — wait two frames so the (server-rendered) content is laid out.
    const saved = sessionStorage.getItem(keyOf());
    if (saved) {
      const y = parseInt(saved, 10);
      if (y > 0) {
        requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
      }
    }

    // Save on scroll, throttled to one write per frame.
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        sessionStorage.setItem(keyOf(), String(Math.round(window.scrollY)));
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      // Final save on navigation away, so opening a project captures the exact spot.
      sessionStorage.setItem(keyOf(), String(Math.round(window.scrollY)));
    };
  }, [pathname]);

  return null;
}
