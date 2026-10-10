"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { IconUpload as Upload, IconX as X, IconFileText as FileText } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  className?: string;
  /**
   * Tanlangan File bilan işga tuşadi (yoki tozalanganda null bilan). Ota komponentga
   * tanlovni özi boshqariş imkonini beradi — masalan, uni alohida "Add" tugmasi
   * ortida saqlab turiş yoki yuklaşdan oldin siqiş uçun — input.files ni qayta
   * öqimasdan. `onChange` ham baribir işga tuşadi.
   */
  onFileChange?: (file: File | null) => void;
};

/**
 * Ikki holatli fayl tanlagiç:
 *
 *   böş   → töliq kenglikdagi çiziqli dropzone (istalgan joyga bosing / faylni tortib taşlang)
 *   töla  → ixcham qator: fayl belgisi, fayl nomi, almaştiriş, tozalaş
 *
 * Bitta mexanizm, UI ning har bir qismi uçun aniq bitta joy. Brauzerning öziga
 * xos "Choose File / No file chosen" körinişi çiqib qolmaydi; tugma yonida
 * noqulay turadigan alohida placeholder qatori ham yöq.
 */
export const FileInput = React.forwardRef<HTMLInputElement, Props>(
  ({ className, onChange, onFileChange, ...props }, ref) => {
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
      const picked = e.currentTarget.files?.[0] ?? null;
      setFileName(picked?.name ?? null);
      onChange?.(e);
      onFileChange?.(picked);
    }

    function openPicker() {
      internalRef.current?.click();
    }

    function clear(e?: React.MouseEvent) {
      e?.stopPropagation();
      if (internalRef.current) internalRef.current.value = "";
      setFileName(null);
      onFileChange?.(null);
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file || !internalRef.current) return;
      // Faylni DataTransfer orqali input.files ga joylaymiz, şunda input.files ni
      // öqiydigan kod özgarişsiz işlayveradi.
      const dt = new DataTransfer();
      dt.items.add(file);
      internalRef.current.files = dt.files;
      setFileName(file.name);
      // Yuborilgan 'change' handleChange ni işga tuşiradi, u esa onChange +
      // onFileChange ni çaqiradi — şu bois ularni bu yerda töğridan-töğri çaqirmaymiz (ikki marta işga tuşişining oldini oladi).
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
          <div className="flex items-center gap-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] px-3 py-2.5">
            <div className="size-10 rounded-[var(--radius-m)] bg-[color-mix(in_oklab,var(--tint)_14%,transparent)] grid place-items-center text-[var(--tint)] shrink-0">
              <FileText className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-[var(--ink)]" title={fileName}>{fileName}</p>
              <button
                type="button"
                onClick={openPicker}
                className="text-xs text-[var(--ink-2)] hover:text-[var(--tint)] font-medium transition-colors"
              >
                {t("common.replaceFile")}
              </button>
            </div>
            <button
              type="button"
              onClick={clear}
              aria-label={t("common.cancel")}
              className="size-8 rounded-[var(--radius-m)] hover:bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] hover:text-[var(--danger)] grid place-items-center text-[var(--ink-3)] shrink-0 transition-colors"
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
              "w-full rounded-[var(--radius-control)] border-2 border-dashed flex flex-col items-center justify-center gap-1.5 py-6 px-4 cursor-pointer select-none transition-colors",
              dragging
                ? "border-[var(--tint)] bg-[color-mix(in_oklab,var(--tint)_10%,transparent)]"
                : "border-[var(--line-strong)] bg-[var(--surface-2)] hover:border-[var(--tint)] hover:bg-[color-mix(in_oklab,var(--tint)_8%,transparent)]"
            )}
          >
            <div className="size-11 rounded-[var(--radius-control)] bg-[var(--surface)] grid place-items-center text-[var(--tint)] shadow-[var(--shadow-1)]">
              <Upload className="size-5" />
            </div>
            <span className="text-sm font-bold text-[var(--ink)]">{t("common.chooseFile")}</span>
            <span className="text-xs text-[var(--ink-2)]">{t("common.orDropHere")}</span>
          </div>
        )}
      </div>
    );
  }
);
FileInput.displayName = "FileInput";
