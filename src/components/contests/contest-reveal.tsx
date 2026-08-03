"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Sparkles, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { WinnerReveal } from "@/components/contests/winner-reveal";
import { compressImage } from "@/lib/images/compress";
import { removeContestLogo } from "@/server/actions/contests";

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

  return (
    <div className="space-y-3">
      {winnerName ? (
        <button
          onClick={() => setOpen(true)}
          className="group flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#c9982a] via-[#ffd54a] to-[#c9982a] px-5 py-3.5 text-sm font-extrabold text-[#3a2a00] shadow-[0_10px_28px_-8px_rgba(201,152,42,0.7)] transition-transform hover:scale-[1.02] active:scale-100 sm:text-base"
        >
          <Sparkles className="size-5" />
          {t("tanlov.revealWinner")}
        </button>
      ) : (
        <p className="rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-3 text-center text-sm text-[var(--muted)]">
          {t("tanlov.noWinner")}
        </p>
      )}

      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
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

      {open && winnerName && (
        <WinnerReveal contestName={contestName} winnerName={winnerName} logoUrl={logoUrl} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
