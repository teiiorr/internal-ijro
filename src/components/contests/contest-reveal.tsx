"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconPhotoPlus as ImagePlus, IconLoader2 as Loader2, IconTrash as Trash2 } from "@tabler/icons-react";
import { compressImage } from "@/lib/images/compress";
import { removeContestLogo } from "@/server/actions/contests";

export function ContestReveal({
  contestId,
  winnerName,
  logoUrl,
  canManage,
}: {
  contestId: string;
  winnerName: string;
  logoUrl: string | null;
  canManage: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
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
        <div className="flex flex-col items-center gap-4 py-4 text-center sm:py-6">
          {logoUrl && (
            <div className="grid size-24 place-items-center overflow-hidden rounded-2xl bg-[var(--surface-2)] ring-1 ring-[var(--border)] sm:size-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={winnerName} className="size-full object-contain p-1.5" />
            </div>
          )}
          <p className="font-display break-words text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            {winnerName}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          {t("tanlov.noWinner")}
        </div>
      )}

      {canManage && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
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
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPickLogo} />
        </div>
      )}
    </div>
  );
}
