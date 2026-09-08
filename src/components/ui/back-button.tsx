"use client";
import { useRouter } from "@/i18n/navigation";
import { IconArrowLeft as ArrowLeft } from "@tabler/icons-react";

/**
 * Katta yumaloq "orqaga" tugmasi. history back() dan foydalanadi, şu bois oldingi
 * sahifaga holati saqlangan holda qaytadi (masalan, filtrlangan loyihalar röyxati
 * filtrlarini saqlab qoladi); tarix bölmasa (deep link / sahifani yangilaş)
 * `fallbackHref` ga qaytadi. Çaqqon bosiş animatsiyasi.
 */
export function BackButton({ fallbackHref, className = "" }: { fallbackHref: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="←"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className={
        "grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] " +
        "text-[var(--foreground)] shadow-[var(--shadow-1)] transition-[transform,background-color,box-shadow] duration-150 ease-out " +
        "hover:bg-[var(--surface-2)] hover:shadow-[var(--shadow-2)] active:scale-90 " +
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)] " +
        className
      }
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}
