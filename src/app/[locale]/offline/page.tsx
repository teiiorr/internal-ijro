import Image from "next/image";
import { WifiOff } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { RetryButton } from "./retry-button";

export default async function OfflinePage() {
  const t = await getTranslations("offline");
  const tCommon = await getTranslations("common");

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-5 sm:p-8 relative">
      <div className="w-full max-w-md rounded-3xl glass-strong p-7 sm:p-9 text-center">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-3xl bg-[var(--surface-2)]">
          <Image
            src="/brand-mark.svg"
            alt=""
            width={56}
            height={56}
            priority
            unoptimized
            style={{ objectFit: "contain" }}
          />
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--danger-soft)] px-3 py-1 text-[12px] font-bold text-[var(--danger)]">
          <WifiOff className="size-3.5" aria-hidden />
          Offline
        </div>

        <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight text-[var(--foreground)]">
          {t("title")}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">{t("subtitle")}</p>

        <div className="mt-7 flex justify-center">
          <RetryButton label={t("retry")} reconnectedLabel={tCommon("loading")} />
        </div>

        <p className="mt-5 text-[12px] text-[var(--subtle)]">{t("hint")}</p>
      </div>
    </main>
  );
}
