"use client";
import { useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setProjectPoster, removeProjectPoster } from "@/server/actions/projects";

/**
 * Square project poster with upload/remove. Falls back to the project's initial
 * on a soft gradient when no image is set.
 */
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

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    start(async () => {
      await setProjectPoster(projectId, f);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow-1)]">
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt={name} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
            <span className="select-none text-6xl font-black text-[var(--subtle)]">{name.trim().charAt(0).toUpperCase()}</span>
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
