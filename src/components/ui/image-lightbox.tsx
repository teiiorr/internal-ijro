"use client";
import { useCallback, useEffect, useState } from "react";
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
  const [loaded, setLoaded] = useState(false);

  // Rasm almashganda — qayta "yuklanmoqda" holatiga qaytamiz (toʻliq yuklangach koʻrsatiladi).
  useEffect(() => {
    setLoaded(false);
  }, [img?.url]);

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
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-4 backdrop-blur-md sm:p-6"
      onClick={onClose}
    >
      {/* Yopish — yuqori oʻng burchak */}
      <button
        onClick={onClose}
        aria-label="Yopish"
        className="absolute right-3 top-3 z-20 grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>

      {/* Nomi — yuqori chap */}
      <p className="pointer-events-none absolute left-4 top-5 z-10 max-w-[68vw] truncate text-sm font-medium text-white/75">
        {img.name}
      </p>

      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
          aria-label="Oldingi"
          className="absolute left-2 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-4 sm:size-12"
        >
          <ChevronLeft className="size-6" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
          aria-label="Keyingi"
          className="absolute right-2 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-4 sm:size-12"
        >
          <ChevronRight className="size-6" />
        </button>
      )}

      {/* Rasm — markazda, toʻliq yuklangach koʻrsatiladi (qismlarga boʻlinib chizilmaydi) */}
      <div className="relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="size-8 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
          </div>
        )}
        <img
          key={img.url}
          src={img.url}
          alt={img.name}
          loading="eager"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={`max-h-[82dvh] max-w-full rounded-[var(--radius-media)] object-contain transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      {/* Hisoblagich — pastda */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs text-white/50">
        {index + 1} / {images.length}
        {img.date && <span className="ml-2">{img.date}</span>}
      </div>
    </div>
  );
}
