import type { ReactNode } from "react";
import { Heading } from "./Heading";

/**
 * Sahifa sarlavhasi + bitta asboblar qatori (jiddiy/ixcham): sarlavha (+ixtiyoriy
 * qisqa izoh) chapda; o'ngda amallar (primary birinchi). Pastda — ixtiyoriy asboblar
 * qatori (segmented, filtrlar). Telefonda amallar to'liq kenglikda, o'ngga tekislangan.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  tools,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
  tools?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {back}
          <div className="min-w-0">
            <Heading level={1} trim className="min-w-0 break-words">{title}</Heading>
            {subtitle && <p className="mt-1 text-sm font-medium text-[var(--muted)]">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:justify-end">{actions}</div>}
      </div>
      {tools && <div className="flex flex-wrap items-center gap-2">{tools}</div>}
    </header>
  );
}
