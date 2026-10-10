"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconPhotoPlus as ImagePlus, IconLoader2 as Loader2, IconTrash as Trash2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
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
      try { const r = await compressImage(file); f = r.file; } catch { /* asl fayl */ }
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
        <div className="flex flex-col items-center gap-4 py-2 text-center sm:py-4">
          {logoUrl && (
            <div className="grid size-24 place-items-center overflow-hidden rounded-[var(--radius-media)] border border-[var(--line)] bg-[var(--surface-2)] sm:size-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={winnerName} className="size-full object-contain p-1.5" />
            </div>
          )}
          <p className="break-words font-[family-name:var(--font-ui)] text-2xl font-bold leading-tight tracking-tight text-[var(--ink)] sm:text-3xl">
            {winnerName}
          </p>
        </div>
      ) : (
        <p className="py-6 text-center t-body text-[var(--ink-3)]">{t("tanlov.noWinner")}</p>
      )}

      {canManage && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {logoUrl ? t("tanlov.changeLogo") : t("tanlov.setLogo")}
          </Button>
          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[var(--danger)]"
              disabled={pending}
              onClick={() => start(async () => { await removeContestLogo(contestId); router.refresh(); })}
            >
              <Trash2 className="size-4" />
              {t("tanlov.removeLogo")}
            </Button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPickLogo} />
        </div>
      )}
    </div>
  );
}
