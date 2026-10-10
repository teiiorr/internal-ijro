import type { ReactNode } from "react";
import { Card } from "@/components/ui-biib/Card";

/**
 * Yagona auth kartasi (A6.7). Qattiq `--surface` karta — oyna-ustida-oyna EMAS
 * (auth chromasi allaqachon oyna). Sarlavha chapga tekis, jiddiy, Manrope, oltin emas.
 * Bitta ustun, bitta yoʻl: forma, soʻng pastda matnli ikkilamchi havolalar.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card solid className="p-6 sm:p-8">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-[family-name:var(--font-ui)] text-[1.375rem] font-bold tracking-tight text-[var(--ink)] sm:text-[1.5rem]">
            {title}
          </h1>
          {subtitle && <p className="t-small text-[var(--ink-2)]">{subtitle}</p>}
        </div>
        {children}
        {footer && (
          <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-5 t-small">{footer}</div>
        )}
      </div>
    </Card>
  );
}

/** Auth ikkilamchi matn havolasi uchun umumiy klass (xotirjam, koʻk, ramkasiz). */
export const AUTH_LINK =
  "font-semibold text-[var(--tint)] transition-colors hover:text-[var(--tint-hover)]";
