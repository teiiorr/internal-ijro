"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight, IconPhotoPlus as ImagePlus, IconLoader2 as Loader2, IconTrash as Trash2, IconPhoto as Images } from "@tabler/icons-react";
import { compressImage } from "@/lib/images/compress";
import { removeContestPhoto } from "@/server/actions/contests";
import type { ContestPhoto } from "@/server/queries/contests";

const AUTOPLAY_MS = 5000;

export function ContestGallery({ contestId, photos, canManage }: { contestId: string; photos: ContestPhoto[]; canManage: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const count = photos.length;

  const go = useCallback((dir: number) => setActive((i) => (count ? (i + dir + count) % count : 0)), [count]);

  // Auto-advance every 5s (paused on hover / when only one photo). Depending on
  // `active` re-arms the timer after each slide — so manual prev/next/dot taps
  // also reset the 5s window (matters on touch, where there's no hover-pause).
  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setTimeout(() => setActive((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [paused, count, active]);

  useEffect(() => { if (active >= count) setActive(0); }, [active, count]);

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

  const current = photos[Math.min(active, count - 1)];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{t("tanlov.gallery")}</h3>
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

      {count === 0 ? (
        <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-[var(--border-strong)] text-[var(--subtle)]">
          <Images className="size-9" />
        </div>
      ) : (
        <>
          <div
            className="group relative aspect-video w-full overflow-hidden rounded-xl bg-[var(--surface-2)]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {photos.map((p, i) => {
              const near = i === active || i === (active + 1) % count || i === (active - 1 + count) % count;
              if (!near) return null;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.fileUrl}
                  alt={p.caption ?? ""}
                  decoding="async"
                  className={`absolute inset-0 size-full object-contain transition-opacity duration-700 ${i === active ? "opacity-100" : "opacity-0"}`}
                />
              );
            })}

            {count > 1 && (
              <>
                <button
                  type="button"
                  aria-label={t("tanlov.prev")}
                  onClick={() => go(-1)}
                  className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)]/85 text-[var(--foreground)] backdrop-blur-sm transition-colors hover:bg-[var(--surface)] sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label={t("tanlov.next")}
                  onClick={() => go(1)}
                  className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)]/85 text-[var(--foreground)] backdrop-blur-sm transition-colors hover:bg-[var(--surface)] sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <ChevronRight className="size-5" />
                </button>
                <span className="absolute right-2 top-2 rounded-md bg-black/40 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white backdrop-blur-sm">
                  {active + 1} / {count}
                </span>
              </>
            )}

            {canManage && current && (
              <button
                type="button"
                aria-label={t("common.delete")}
                disabled={pending}
                onClick={() => start(async () => { await removeContestPhoto(current.id); router.refresh(); })}
                className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-lg bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-[var(--danger)]"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>

          {count > 1 && (
            <div className="flex items-center justify-center gap-1.5">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label={`${i + 1}`}
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-[var(--primary)]" : "w-1.5 bg-[var(--border-strong)] hover:bg-[var(--muted)]"}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
