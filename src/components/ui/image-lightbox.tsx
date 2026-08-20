"use client";
import { useCallback, useEffect } from "react";
import {
  IconX as X,
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
} from "@tabler/icons-react";

type LightboxImage = { url: string; name: string; date?: string };

export function ImageLightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const img = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(index - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(index + 1);
    },
    [onClose, onNavigate, index, hasPrev, hasNext],
  );

  useEffect(() => {
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onKey]);

  if (!img) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-md" onClick={onClose}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white/80" onClick={(e) => e.stopPropagation()}>
        <p className="min-w-0 truncate text-sm font-medium">{img.name}</p>
        <button onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/10 transition-colors">
          <X className="size-5" />
        </button>
      </div>

      {/* Image */}
      <div className="flex flex-1 items-center justify-center px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        {hasPrev && (
          <button
            onClick={() => onNavigate(index - 1)}
            className="absolute left-2 sm:left-4 z-10 grid size-10 sm:size-12 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}
        <img
          src={img.url}
          alt={img.name}
          className="max-h-[80dvh] max-w-full rounded-lg object-contain"
        />
        {hasNext && (
          <button
            onClick={() => onNavigate(index + 1)}
            className="absolute right-2 sm:right-4 z-10 grid size-10 sm:size-12 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>

      {/* Counter */}
      <div className="pb-4 text-center text-xs text-white/50">
        {index + 1} / {images.length}
        {img.date && <span className="ml-2">{img.date}</span>}
      </div>
    </div>
  );
}
