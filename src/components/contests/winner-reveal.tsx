"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { IconX as X } from "@tabler/icons-react";

/**
 * Official winner announcement — a restrained, professional modal (no canvas,
 * no confetti). Uses the app's surface/border tokens so it matches the rest of
 * the UI in both themes.
 */
export function WinnerReveal({
  contestName,
  winnerName,
  logoUrl,
  onClose,
}: {
  contestName: string;
  winnerName: string;
  logoUrl?: string | null;
  onClose: () => void;
}) {
  const t = useTranslations();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative mx-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-[var(--shadow-3)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)]"
        >
          <X className="size-4" />
        </button>

        {logoUrl ? (
          <div className="mx-auto mb-4 grid size-24 place-items-center overflow-hidden rounded-2xl bg-[var(--surface-2)] ring-1 ring-[var(--border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={winnerName} className="size-full object-contain p-1.5" />
          </div>
        ) : (
          <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-[var(--primary-soft)] text-2xl font-bold text-[var(--primary)]">
            {winnerName.trim().charAt(0).toUpperCase()}
          </div>
        )}

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{t("tanlov.winner")}</p>
        <h2 className="mx-auto mt-2 break-words text-2xl font-bold leading-tight text-[var(--foreground)] sm:text-3xl">{winnerName}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{t("tanlov.winnerOf", { name: contestName })}</p>

        <button
          onClick={onClose}
          className="mt-6 rounded-xl bg-[var(--surface-2)] px-6 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-3)]"
        >
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
