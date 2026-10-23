"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { IconEye as Eye, IconEyeOff as EyeOff } from "@tabler/icons-react";
import { installMoneyPrivacy } from "@/lib/privacy/money-privacy";
import { cn } from "@/lib/utils";

/**
 * Faqat egaga körinadigan "köz" tugmasi: sahifadagi barça pul summalarini yashiradi va qayta
 * oçadi. Holat brauzerda saqlanadi, sahifa qayta yuklanganda ham saqlanib qoladi.
 */
export function PrivacyToggle({ className }: { className?: string }) {
  const t = useTranslations("common.privacy");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Inline skript allaqaçon örnatgan bölishi mumkin; bölmasa (mijoz navigatsiyasi) şu yerda örnatiladi.
    setHidden(installMoneyPrivacy(window).isOn());
  }, []);

  function toggle() {
    const api = installMoneyPrivacy(window);
    api.set(!api.isOn());
    setHidden(api.isOn());
  }

  const label = hidden ? t("show") : t("hide");
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full transition-colors",
        hidden ? "bg-[color-mix(in_oklab,var(--tint)_14%,transparent)] text-[var(--tint)]" : "text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
        className,
      )}
    >
      {hidden ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
    </button>
  );
}
