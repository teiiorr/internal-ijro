"use client";
import { useRouter } from "@/i18n/navigation";
import { IconArrowLeft as ArrowLeft } from "@tabler/icons-react";

/**
 * «Orqaga» boshqaruvi — BIIB призрач (ghost) tugma: ramka/karta foni/soya yoʻq, hover'da
 * `--surface-2`. history back() dan foydalanadi, shu bois oldingi sahifaga holati saqlangan
 * holda qaytadi; tarix boʻlmasa `fallbackHref` ga qaytadi.
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
        "grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] " +
        "text-[var(--ink-2)] transition-colors duration-[var(--dur-ui)] ease-[var(--ease-ui)] " +
        "[@media(hover:hover)]:hover:bg-[var(--surface-2)] [@media(hover:hover)]:hover:text-[var(--ink)] active:scale-95 " +
        className
      }
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}
