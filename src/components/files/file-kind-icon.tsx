import {
  IconFile as FileIcon,
  IconFileText as TextIcon,
  IconFileTypeDocx as WordIcon,
  IconFileTypePdf as PdfIcon,
  IconFileTypePpt as SlidesIcon,
  IconFileTypeXls as ExcelIcon,
  IconFileZip as ArchiveIcon,
  IconMovie as VideoIcon,
  IconMusic as AudioIcon,
  IconPhoto as ImageIcon,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { fileKind, type FileKind } from "@/lib/files/file-kind";

const ICON: Record<FileKind, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  pdf: PdfIcon,
  word: WordIcon,
  excel: ExcelIcon,
  slides: SlidesIcon,
  image: ImageIcon,
  archive: ArchiveIcon,
  video: VideoIcon,
  audio: AudioIcon,
  text: TextIcon,
  other: FileIcon,
};

/** Har bir tur öz rangida: qizil PDF, kök Word, yaşil Excel, sariq taqdimot va h.k. (kunduzi va tunda AA kontrast). */
const TONE: Record<FileKind, string> = {
  pdf: "var(--art-6-text)",
  word: "var(--art-5-text)",
  excel: "var(--art-3-text)",
  slides: "var(--art-2-text)",
  image: "var(--art-4-text)",
  archive: "var(--ink-2)",
  video: "var(--art-1-text)",
  audio: "var(--art-1-text)",
  text: "var(--ink-2)",
  other: "var(--ink-3)",
};

/**
 * Fayl turi belgisi: yumşoq rangli kvadrat içida tur ikonkasi. Rasm uçun `thumbUrl`
 * berilsa, ikonka örnida kiçik rasm çiziladi.
 */
export function FileKindIcon({
  fileName,
  thumbUrl,
  size = "md",
  className,
}: {
  fileName: string;
  thumbUrl?: string | null;
  size?: "md" | "lg";
  className?: string;
}) {
  const kind = fileKind(fileName);
  const Icon = ICON[kind];
  const box = size === "lg" ? "size-12" : "size-10";
  if (thumbUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbUrl}
        alt=""
        loading="lazy"
        className={cn(box, "shrink-0 rounded-[var(--radius-m)] border border-[var(--line)] bg-[var(--surface-2)] object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(box, "grid shrink-0 place-items-center rounded-[var(--radius-m)]", className)}
      style={{ color: TONE[kind], backgroundColor: `color-mix(in oklab, ${TONE[kind]} 13%, transparent)` }}
    >
      <Icon className={size === "lg" ? "size-6" : "size-[22px]"} aria-hidden />
    </span>
  );
}
