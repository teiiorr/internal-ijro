"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";

/** "6000000" → "6 000 000"; bitta kasr ajratgiçini ("." yoki ",") saqlaydi. */
function format(raw: string): string {
  let s = String(raw).replace(/,/g, ".").replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
  const [intPart, frac] = s.split(".");
  const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return frac !== undefined ? `${intFmt}.${frac}` : intFmt;
}
const rawOf = (display: string) => display.replace(/\s/g, "");

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "type"
> & {
  /** Berilganda, yaşirin input FormData uçun xom (probelsiz) raqam satrini olib yuradi. */
  name?: string;
  value?: string | number | null;
  defaultValue?: string | number | null;
  /** Xom raqam satri (probelsiz) bilan işga tuşadi, masalan "6000000". */
  onValueChange?: (raw: string) => void;
};

/**
 * Foydalanuvçi terayotganda qiymatni minglik ajratgiçlar bilan körsatadigan summa
 * inputi (6000000 → "6 000 000"). Uni yo boşqariladigan `value`/`onValueChange`
 * jufti orqali, yo oddiy formada `name` orqali yuboriladi (yaşirin input xom
 * raqamlarni saqlaydi).
 */
export function MoneyInput({ name, value, defaultValue, onValueChange, inputMode, ...props }: Props) {
  const [display, setDisplay] = React.useState(() => format(String(value ?? defaultValue ?? "")));

  // Boşqariladigan `value` taşqaridan özgarganda holatni sinxron saqlab turamiz.
  React.useEffect(() => {
    if (value === undefined || value === null) return;
    const f = format(String(value));
    setDisplay((prev) => (rawOf(prev) === rawOf(f) ? prev : f));
  }, [value]);

  return (
    <>
      <Input
        {...props}
        inputMode={inputMode ?? "decimal"}
        value={display}
        onChange={(e) => {
          const f = format(e.target.value);
          setDisplay(f);
          onValueChange?.(rawOf(f));
        }}
      />
      {name ? <input type="hidden" name={name} value={rawOf(display)} /> : null}
    </>
  );
}
