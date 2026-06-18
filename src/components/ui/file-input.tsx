"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  className?: string;
};

/**
 * Two-state file picker:
 *
 *   empty  → full-width dashed dropzone (click anywhere / drag a file in)
 *   filled → compact row: file icon · filename · replace · clear
 *
 * One mechanism, one place for each piece of UI to live. No native browser
 * "Choose File / No file chosen" leaks; no separate placeholder line that
 * sits awkwardly next to the button.
 */
export const FileInput = React.forwardRef<HTMLInputElement, Props>(
  ({ className, onChange, ...props }, ref) => {
    const t = useTranslations();
    const internalRef = React.useRef<HTMLInputElement | null>(null);
    const [fileName, setFileName] = React.useState<string | null>(null);
    const [dragging, setDragging] = React.useState(false);

    function setRefs(el: HTMLInputElement | null) {
      internalRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      setFileName(e.currentTarget.files?.[0]?.name ?? null);
      onChange?.(e);
    }

    function openPicker() {
      internalRef.current?.click();
    }

    function clear(e?: React.MouseEvent) {
      e?.stopPropagation();
      if (internalRef.current) internalRef.current.value = "";
      setFileName(null);
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file || !internalRef.current) return;
      // Sync the File into the input.files via DataTransfer so consumers
      // that read input.files keep working unchanged.
      const dt = new DataTransfer();
      dt.items.add(file);
      internalRef.current.files = dt.files;
      setFileName(file.name);
      internalRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }

    return (
      <div className={className}>
        <input
          ref={setRefs}
          type="file"
          className="sr-only"
          onChange={handleChange}
          {...props}
        />

        {fileName ? (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
            <div className="size-10 rounded-lg bg-[var(--primary-soft)] grid place-items-center text-[var(--primary)] shrink-0">
              <FileText className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" title={fileName}>{fileName}</p>
              <button
                type="button"
                onClick={openPicker}
                className="text-xs text-[var(--muted)] hover:text-[var(--primary)] font-medium transition-colors"
              >
                {t("common.replaceFile")}
              </button>
            </div>
            <button
              type="button"
              onClick={clear}
              aria-label={t("common.cancel")}
              className="size-8 rounded-md hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] grid place-items-center text-[var(--muted)] shrink-0 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={openPicker}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPicker(); } }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 py-6 px-4 cursor-pointer select-none transition-colors",
              dragging
                ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                : "border-[var(--border-strong)] bg-[var(--surface-2)]/60 hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
            )}
          >
            <div className="size-11 rounded-xl bg-[var(--surface)] grid place-items-center text-[var(--primary)] shadow-[var(--shadow-1)]">
              <Upload className="size-5" />
            </div>
            <span className="text-sm font-bold">{t("common.chooseFile")}</span>
            <span className="text-xs text-[var(--muted)]">{t("common.orDropHere")}</span>
          </div>
        )}
      </div>
    );
  }
);
FileInput.displayName = "FileInput";
