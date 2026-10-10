import * as React from "react";
import { Rows } from "@/components/ui-biib/Rows";
import { Status, type StatusTone } from "@/components/ui-biib/Status";

/** Guruh signal rangi: faqat qaror talab qiladigan guruhlar (xavf/ogohlantirish) Status oladi. */
export type GroupTone = "default" | "success" | "warning" | "danger";

const COUNT_STATUS: Partial<Record<GroupTone, StatusTone>> = {
  warning: "warning",
  danger: "danger",
};

/**
 * Brifing guruhi — ramkali quti EMAS: yengil sarlavha + son, soʻng ajratuvchi qatorlar
 * (Rows). Birinchi `visible` ta qator koʻrinadi, qolgani JS'siz `<details>` ichida.
 * `render` har bir element uchun toʻliq `<Row>` qaytaradi (butun qator — havola).
 */
export function BriefGroup<T>({
  title,
  icon,
  tone = "default",
  items,
  render,
  getKey,
  moreLabel,
  visible = 6,
}: {
  title: string;
  icon?: React.ReactNode;
  tone?: GroupTone;
  items: T[];
  render: (item: T) => React.ReactNode;
  getKey: (item: T, i: number) => string;
  moreLabel: (count: number) => string;
  visible?: number;
}) {
  const head = items.slice(0, visible);
  const rest = items.slice(visible);
  const countTone = COUNT_STATUS[tone];

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 pb-1">
        <h3 className="flex min-w-0 items-center gap-1.5 t-label text-[var(--ink-2)]">
          {icon && <span className="shrink-0 text-[var(--ink-3)]">{icon}</span>}
          <span className="min-w-0 break-words">{title}</span>
        </h3>
        {countTone ? (
          <Status tone={countTone} className="shrink-0">
            {items.length}
          </Status>
        ) : (
          <span className="shrink-0 t-micro tabular-nums text-[var(--ink-3)]">{items.length}</span>
        )}
      </div>

      <Rows>{head.map((it, i) => <React.Fragment key={getKey(it, i)}>{render(it)}</React.Fragment>)}</Rows>

      {rest.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none py-2 t-small font-semibold text-[var(--tint)] hover:underline group-open:hidden">
            {moreLabel(rest.length)}
          </summary>
          <Rows>{rest.map((it, i) => <React.Fragment key={getKey(it, i + visible)}>{render(it)}</React.Fragment>)}</Rows>
        </details>
      )}
    </div>
  );
}

/** Qator ichidagi kontent: chapda nom/izoh (qisqaradi), oʻngda meta. `<Row>` ichida ishlatiladi. */
export function BriefRow({
  primary,
  secondary,
  meta,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.9375rem] font-medium text-[var(--ink)]">{primary}</div>
        {secondary != null && <div className="mt-0.5 truncate t-small text-[var(--ink-3)]">{secondary}</div>}
      </div>
      {meta != null && <div className="shrink-0 t-small tabular-nums text-[var(--ink-3)]">{meta}</div>}
    </>
  );
}
