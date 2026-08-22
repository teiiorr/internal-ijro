"use client";
import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { IconPhotoPlus as ImagePlus, IconTrash as Trash2, IconLoader2 as Loader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { setProjectPoster, removeProjectPoster } from "@/server/actions/projects";

export function ProjectPoster({
  projectId,
  posterUrl,
  name,
  canManage,
}: {
  projectId: string;
  posterUrl: string | null;
  name: string;
  canManage: boolean;
}) {
  const t = useTranslations();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [imgLoaded, setImgLoaded] = useState(false);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImgLoaded(false);
    start(async () => {
      await setProjectPoster(projectId, f);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow-1)]">
        {posterUrl ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 skeleton-shimmer rounded-2xl" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl}
              alt={name}
              loading="lazy"
              decoding="async"
              className={`size-full object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImgLoaded(true)}
            />
          </>
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
            <span className="select-none text-6xl font-black text-[var(--subtle)]">{name.trim().charAt(0).toUpperCase()}</span>
          </div>
        )}
        {pending && (
          <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-sm rounded-2xl">
            <Loader2 className="size-8 text-white animate-spin" />
          </div>
        )}
      </div>
      {canManage && (
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPick} />
          <Button type="button" variant="outline" size="sm" className="flex-1" disabled={pending} onClick={() => fileRef.current?.click()}>
            <ImagePlus className="size-4" />
            {t("projects.poster.change")}
          </Button>
          {posterUrl && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={pending}
              aria-label={t("common.delete")}
              onClick={() => start(async () => { await removeProjectPoster(projectId); })}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
