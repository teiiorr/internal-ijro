"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { IconAlertTriangle, IconRefresh, IconHome } from "@tabler/icons-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui-biib/Button";

/**
 * [locale] daraxtidagi barcha sahifa/komponent xatolarini ushlovchi chegara.
 * Next 16.2: tiklash uchun `unstable_retry` (eski `reset`ga ham chidamli).
 */
export default function Error({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  const t = useTranslations("errorPage");
  const retry = unstable_retry ?? reset;

  useEffect(() => {
    // TODO(observability): bu yerda xatolikni tashqi monitoringga yuborish mumkin.
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[70dvh] place-items-center px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <div
          className="mb-5 grid size-16 place-items-center rounded-[var(--radius-card)]"
          style={{ backgroundColor: "color-mix(in oklab, var(--danger) 14%, transparent)" }}
        >
          <IconAlertTriangle className="size-8 text-[var(--danger)]" stroke={1.75} />
        </div>
        <h1 className="t-h3 text-[var(--ink)]">{t("errorTitle")}</h1>
        <p className="mt-2 t-body text-[var(--ink-2)]">{t("errorDesc")}</p>
        {error?.digest && (
          <p className="mt-2 t-micro font-mono text-[var(--ink-3)]">#{error.digest}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {retry && (
            <Button icon={IconRefresh} onClick={() => retry()}>
              {t("retry")}
            </Button>
          )}
          <Button asChild variant="ghost" icon={IconHome}>
            <Link href="/">{t("home")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
