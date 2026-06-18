"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  className?: string;
};

/**
 * Custom file picker that hides the native browser button — that one's text
 * comes from the OS locale and there's no way to translate it. We render a
 * styled "Faylni tanlang" pill + the selected filename + a clear-button.
 * Forwards the underlying <input ref> so callers that read .files keep
 * working unchanged.
 */
export const FileInput = React.forwardRef<HTMLInputElement, Props>(
  ({ className, onChange, ...props }, ref) => {
    const t = useTranslations();
    const internalRef = React.useRef<HTMLInputElement | null>(null);
    const [fileName, setFileName] = React.useState<string | null>(null);

    function setRefs(el: HTMLInputElement | null) {
      internalRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      setFileName(e.currentTarget.files?.[0]?.name ?? null);
      onChange?.(e);
    }

    function clear() {
      if (internalRef.current) internalRef.current.value = "";
      setFileName(null);
    }

    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-[var(--input)] bg-[var(--surface)] p-1.5 pl-3",
          className
        )}
      >
        <input
          ref={setRefs}
          type="file"
          className="sr-only"
          onChange={handleChange}
          {...props}
        />
        <button
          type="button"
          onClick={() => internalRef.current?.click()}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-semibold shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.20)] hover:bg-[var(--primary-hover)] transition-colors"
        >
          <Upload className="size-4" />
          {t("common.chooseFile")}
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2 text-sm">
          {fileName ? (
            <>
              <FileText className="size-4 text-[var(--muted)] shrink-0" />
              <span className="truncate font-medium" title={fileName}>{fileName}</span>
            </>
          ) : (
            <span className="text-[var(--subtle)]">{t("common.noFileChosen")}</span>
          )}
        </div>
        {fileName && (
          <button
            type="button"
            onClick={clear}
            aria-label={t("common.cancel")}
            className="size-8 rounded-md hover:bg-[var(--surface-2)] grid place-items-center text-[var(--muted)] shrink-0"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  }
);
FileInput.displayName = "FileInput";
