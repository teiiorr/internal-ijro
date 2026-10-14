import type { ReactNode } from "react";

/**
 * Koʻrinmas (`sr-only`) jonli hudud — asinxron holat oʻzgarishlarini ekran
 * oʻquvchilariga yetkazadi (yuklanmoqda / natija), vizual UI'ni oʻzgartirmasdan.
 *
 * `children` boʻsh boʻlsa hech narsa eʼlon qilinmaydi; matn paydo boʻlganda
 * ekran oʻquvchisi uni «polite» (yoki `assertive`) tartibida oʻqiydi.
 */
export function LiveRegion({
  children,
  assertive = false,
}: {
  children?: ReactNode;
  assertive?: boolean;
}) {
  return (
    <div role="status" aria-live={assertive ? "assertive" : "polite"} aria-atomic="true" className="sr-only">
      {children}
    </div>
  );
}
