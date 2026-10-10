"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight, IconPhotoPlus as ImagePlus, IconLoader2 as Loader2, IconTrash as Trash2, IconPhoto as Images } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
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

  // Har 5 soniyada avtomatik almaşadi (hover'da yoki faqat bitta rasm bölsa töxtaydi).
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
      try { const r = await compressImage(file); f = r.file; } catch { /* asl fayl */ }
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
    <section className="min-w-0">
      <div className="section-header flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-[family-name:var(--font-ui)] text-[1.0625rem] font-bold tracking-tight text-[var(--ink)] sm:text-[1.1875rem]">{t("tanlov.gallery")}</h2>
        {canManage && (
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {t("tanlov.addPhoto")}
          </Button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPick} />
      </div>

      {count === 0 ? (
        <div className="grid aspect-video place-items-center rounded-[var(--radius-media)] border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-3)]">
          <Images className="size-9" aria-hidden />
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className="group relative aspect-video w-full overflow-hidden rounded-[var(--radius-media)] border border-[var(--line)] bg-[var(--surface-2)]"
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
                  className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-[var(--radius-control)] bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/60 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label={t("tanlov.next")}
                  onClick={() => go(1)}
                  className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-[var(--radius-control)] bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/60 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <ChevronRight className="size-5" />
                </button>
                <span className="absolute right-2 top-2 rounded-[var(--radius-s)] bg-black/45 px-1.5 py-0.5 t-micro tabular-nums text-white backdrop-blur-sm">
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
                className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-[var(--radius-s)] bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-[var(--danger)]"
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
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-[var(--dur-ui)] ${i === active ? "w-5 bg-[var(--tint)]" : "w-1.5 bg-[var(--line-strong)] hover:bg-[var(--ink-3)]"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
