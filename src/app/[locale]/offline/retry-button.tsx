"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export function RetryButton({ label, reconnectedLabel }: { label: string; reconnectedLabel: string }) {
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    function update() {
      setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    }
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (online && typeof window !== "undefined") {
      const t = window.setTimeout(() => window.location.reload(), 600);
      return () => window.clearTimeout(t);
    }
  }, [online]);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        window.location.reload();
      }}
      className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3 text-[15px] font-bold text-white shadow-[0_8px_24px_-8px_var(--primary-glow)] transition-all hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:opacity-60"
    >
      <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} aria-hidden />
      {online ? reconnectedLabel : label}
    </button>
  );
}
