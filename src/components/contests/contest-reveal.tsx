"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { IconPhotoPlus as ImagePlus, IconLoader2 as Loader2, IconTrash as Trash2, IconSpeakerphone as Announce } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { StatusTag } from "@/components/ui/status-tag";
import { compressImage } from "@/lib/images/compress";
import { removeContestLogo } from "@/server/actions/contests";

// Ceremony modal — only pulled in when the winner is announced.
const WinnerReveal = dynamic(
  () => import("@/components/contests/winner-reveal").then((m) => m.WinnerReveal),
  { ssr: false },
);

export function ContestReveal({
  contestId,
  contestName,
  winnerName,
  logoUrl,
  canManage,
}: {
  contestId: string;
  contestName: string;
  winnerName: string;
  logoUrl: string | null;
  canManage: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      let f = file;
      try { const r = await compressImage(file); f = r.file; } catch { /* original */ }
      const qs = new URLSearchParams({ contestId, name: f.name });
      const res = await fetch(`/api/files/contest-logo?${qs.toString()}`, {
        method: "POST",
        headers: { "content-type": f.type || "application/octet-stream" },
        body: f,
      });
      if (!res.ok) { toast.error(t("tanlov.photoError")); return; }
      toast.success(t("common.saved"));
      router.refresh();
    } catch {
      toast.error(t("tanlov.photoError"));
    } finally {
      setUploading(false);
    }
  }

  const hasWinner = !!winnerName;

  return (
    <div>
      {hasWinner ? (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
          {/* soft accent wash — a specific effect, not decoration */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--success-soft)] to-transparent opacity-60" aria-hidden />
          <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[var(--surface-2)] ring-1 ring-[var(--border)]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={winnerName} className="size-full object-contain p-1.5" />
              ) : (
                <span className="text-3xl font-bold text-[var(--muted)]">{winnerName.trim().charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <StatusTag tone="green">{t("tanlov.winner")}</StatusTag>
              </div>
              <h2 className="mt-1.5 break-words text-xl font-bold leading-tight sm:text-2xl">{winnerName}</h2>
            </div>
            <Button variant="outline" onClick={() => setOpen(true)} className="shrink-0">
              <Announce className="size-4" />{t("tanlov.revealWinner")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          {t("tanlov.noWinner")}
        </div>
      )}

      {canManage && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--foreground)]"
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
            {logoUrl ? t("tanlov.changeLogo") : t("tanlov.setLogo")}
          </button>
          {logoUrl && (
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => { await removeContestLogo(contestId); router.refresh(); })}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
            >
              <Trash2 className="size-3.5" /> {t("tanlov.removeLogo")}
            </button>
          )}
          <span className="text-xs text-[var(--muted)]">{t("tanlov.logoHint")}</span>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPickLogo} />
        </div>
      )}

      {open && hasWinner && (
        <WinnerReveal contestName={contestName} winnerName={winnerName} logoUrl={logoUrl} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
