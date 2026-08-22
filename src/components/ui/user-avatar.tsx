"use client";
import { useState, useCallback } from "react";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, { container: string; text: string }> = {
  xs: { container: "size-8", text: "text-[11px]" },
  sm: { container: "size-10", text: "text-sm" },
  md: { container: "size-12", text: "text-base" },
  lg: { container: "size-16", text: "text-xl" },
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
}

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: Size;
  className?: string;
  clickable?: boolean;
  department?: string | null;
  position?: string | null;
}

export function UserAvatar({ name, avatarUrl, size = "md", className, clickable = true, department, position }: UserAvatarProps) {
  const [lightbox, setLightbox] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const { container, text } = SIZE_MAP[size];
  const hasPhoto = !!avatarUrl && !imgError;

  const handleClick = useCallback(() => {
    if (clickable && hasPhoto) setLightbox(true);
  }, [clickable, hasPhoto]);

  return (
    <>
      <div
        role={clickable && hasPhoto ? "button" : undefined}
        tabIndex={clickable && hasPhoto ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}
        className={cn(
          "rounded-full shrink-0 flex items-center justify-center font-semibold overflow-hidden relative",
          hasPhoto ? "ring-2 ring-[var(--border)]" : "bg-[var(--primary-soft)] text-[var(--primary)]",
          clickable && hasPhoto && "cursor-pointer hover:ring-[var(--primary)] transition-all",
          container,
          text,
          className,
        )}
      >
        {hasPhoto ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 skeleton-shimmer rounded-full" />
            )}
            <img
              src={avatarUrl!}
              alt={name}
              loading="lazy"
              decoding="async"
              className={cn("size-full object-cover transition-opacity duration-300", imgLoaded ? "opacity-100" : "opacity-0")}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          getInitials(name)
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <IconX className="size-7" />
          </button>
          <img
            src={avatarUrl!}
            alt={name}
            className="max-w-[85vw] max-h-[70vh] rounded-2xl object-contain shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-4 text-center text-white animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-lg font-bold">{name}</p>
            {(department || position) && (
              <p className="text-sm text-white/70 mt-1">
                {[position, department].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
