"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ImagePlus, Loader2, X, Images } from "lucide-react";
import { compressImage } from "@/lib/images/compress";
import { removeContestPhoto } from "@/server/actions/contests";
import type { ContestPhoto } from "@/server/queries/contests";

export function ContestGallery({ contestId, photos, canManage }: { contestId: string; photos: ContestPhoto[]; canManage: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const hero = photos[Math.min(active, photos.length - 1)];

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      let f = file;
      try { const r = await compressImage(file); f = r.file; } catch { /* original */ }
      const qs = new URLSearchParams({ contestId, name: f.name });
      const res = await fetch(`/api/files/contest-photos?${qs.toString()}`, {
        method: "POST",
        headers: { "content-type": f.type || "application/octet-stream" },
        body: f,
      });
      if (!res.ok) { toast.error(t("tanlov.photoError")); return; }
      toast.success(t("tanlov.photoAdded"));
      router.refresh();
    } catch {
      toast.error(t("tanlov.photoError"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold"><Images className="size-4 text-[var(--muted)]" />{t("tanlov.gallery")}</h3>
        {canManage && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--foreground)]"
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
            {t("tanlov.addPhoto")}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPick} />
      </div>

      {photos.length === 0 ? (
        <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-[var(--border-strong)] text-[var(--subtle)]">
          <Images className="size-10" />
        </div>
      ) : (
        <>
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[var(--surface-2)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero.fileUrl} alt={hero.caption ?? ""} className="size-full object-contain" />
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {photos.map((p, i) => (
                <div key={p.id} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    className={`block size-16 overflow-hidden rounded-lg ring-2 transition-all ${i === active ? "ring-[var(--primary)]" : "ring-transparent hover:ring-[var(--border-strong)]"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.fileUrl} alt="" className="size-full object-cover" />
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      aria-label={t("common.delete")}
                      disabled={pending}
                      onClick={() => start(async () => { await removeContestPhoto(p.id); router.refresh(); })}
                      className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[var(--danger)] text-white shadow"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
