import type { ReactNode } from "react";
import { Heading } from "./Heading";

/**
 * Sahifa sarlavhasi. h1 MARKAZDA (foydalanuvchi so'rovi), ixtiyoriy izoh ham markazda.
 * Pastda bitta asboblar qatori: chapda orqaga/asboblar (segmented, filtrlar), o'ngda
 * amallar (primary birinchi). Telefonda amallar to'liq kenglikda, o'ngga tekislangan.
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
      <div className="min-w-0">
        <Heading level={1} trim className="block w-full break-words text-center">{title}</Heading>
        {subtitle && <p className="mt-1 text-center text-sm font-medium text-[var(--muted)]">{subtitle}</p>}
      </div>
      {(back || tools || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {back}
            {tools}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:justify-end">{actions}</div>}
        </div>
      )}
    </header>
  );
}
