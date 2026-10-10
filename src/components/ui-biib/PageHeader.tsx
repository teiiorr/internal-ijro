import type { ReactNode } from "react";
import { Heading } from "./Heading";

/**
 * Sahifa sarlavhasi + bitta asboblar qatori (BIIB tartibi, foydalanuvchi uchun
 * jiddiy/ixcham): sarlavha chapda; o'ngda amallar (primary birinchi). Pastda —
 * ixtiyoriy asboblar qatori (orqaga, segmented, filtrlar). Telefonda amallar
 * to'liq kenglikda, o'ngga tekislangan.
 */
export function PageHeader({
  title,
  back,
  actions,
  tools,
}: {
  title: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
  tools?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {back}
          <Heading level={1} trim className="min-w-0 truncate">{title}</Heading>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:justify-end">{actions}</div>}
      </div>
      {tools && <div className="flex flex-wrap items-center gap-2">{tools}</div>}
    </header>
  );
}
