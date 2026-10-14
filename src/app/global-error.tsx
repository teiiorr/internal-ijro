"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { reportError } from "@/lib/observability/report";

/**
 * Oxirgi chora: ildiz layout/template qulaganda ishlaydi va o'z <html>/<body>'siga ega.
 * next-intl provayderidan tashqarida bo'lgani uchun matn standart tilda (uz-latn) beriladi.
 */
export default function GlobalError({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  const retry = unstable_retry ?? reset;

  useEffect(() => {
    // Strukturali log + ixtiyoriy tashqi monitoring (ERROR_REPORT_URL).
    reportError(error, { boundary: "global-error", digest: error?.digest });
  }, [error]);
  return (
    <html lang="uz-Latn">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#0a1026",
          color: "#f4f2ed",
        }}
      >
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.02em" }}>500</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "12px 0 6px" }}>Tizimda xatolik</h1>
          <p style={{ fontSize: 14, opacity: 0.75, margin: "0 0 20px" }}>
            Ilovani yuklashda kutilmagan xatolik yuz berdi. Sahifani yangilang.
          </p>
          {error?.digest && (
            <p style={{ fontSize: 12, opacity: 0.5, fontFamily: "ui-monospace, monospace" }}>
              #{error.digest}
            </p>
          )}
          <button
            onClick={() => (retry ? retry() : window.location.reload())}
            style={{
              marginTop: 8,
              cursor: "pointer",
              border: "none",
              borderRadius: 12,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: "#2563eb",
            }}
          >
            Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}
