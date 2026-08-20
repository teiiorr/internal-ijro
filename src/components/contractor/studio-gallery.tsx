"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconPhoto as PhotoIcon } from "@tabler/icons-react";
import { ImageLightbox } from "@/components/ui/image-lightbox";

type GalleryImage = {
  id: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: Date | string;
  projectName: string;
};

export function StudioGallery({
  images,
  projects,
}: {
  images: GalleryImage[];
  projects: { id: string; name: string }[];
}) {
  const t = useTranslations("contractors.detail.gallery");
  const [filter, setFilter] = useState<string>("all");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const filtered = filter === "all" ? images : images.filter((i) => i.projectName === filter);

  const lightboxImages = filtered.map((i) => ({
    url: i.fileUrl,
    name: i.fileName,
    date: new Date(i.uploadedAt).toLocaleDateString("uz-Latn", { day: "2-digit", month: "short", year: "numeric" }),
  }));

  return (
    <div className="space-y-4">
      {/* Project filter */}
      {projects.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilter("all")}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === "all"
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t("allProjects")}
          </button>
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilter(p.name)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === p.name
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)]">
          <PhotoIcon className="size-10 mb-2 opacity-40" />
          <p className="text-sm font-medium">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 stagger-children">
          {filtered.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setLightboxIdx(i)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-3)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] hover-scale"
            >
              <img
                src={img.fileUrl}
                alt={img.fileName}
                loading="lazy"
                className="size-full object-cover animate-img-reveal transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-6 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="truncate text-[11px] font-medium text-white">{img.fileName}</p>
                <p className="text-[10px] text-white/70">{img.projectName}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx != null && (
        <ImageLightbox
          images={lightboxImages}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNavigate={setLightboxIdx}
        />
      )}
    </div>
  );
}
