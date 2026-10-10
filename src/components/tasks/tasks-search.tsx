"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconSearch as Search } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/**
 * Vazifalar roʻyxati qidiruvi — global sarlavhadan bu yerga koʻchirilgan. Quti yoʻq:
 * faqat bitta maydon. `q` parametrini yozadi, boshqa filtrlarni (scope, tab) saqlaydi.
 */
export function TasksSearch() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      const v = value.trim();
      if (v) sp.set("q", v);
      else sp.delete("q");
      startTransition(() => router.replace(sp.toString() ? `${pathname}?${sp.toString()}` : pathname, { scroll: false }));
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("relative w-full sm:w-64", pending && "opacity-70")}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-3)]" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("common.search")}
        aria-label={t("common.search")}
        className="t-body h-11 w-full rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-[var(--surface-2)] pl-9 pr-3 text-[var(--ink)] placeholder:text-[var(--ink-3)]"
      />
    </div>
  );
}
