"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";

/** "6000000" → "6 000 000"; keeps a single decimal separator ("." or ","). */
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
  /** When set, a hidden input carries the raw (unspaced) numeric string for FormData. */
  name?: string;
  value?: string | number | null;
  defaultValue?: string | number | null;
  /** Fires with the raw numeric string (no spaces), e.g. "6000000". */
  onValueChange?: (raw: string) => void;
};

/**
 * Amount input that renders the value with thousand separators as the user types
 * (6000000 → "6 000 000"). Submit either via a controlled `value`/`onValueChange`
 * pair or, in a plain form, via `name` (a hidden input holds the raw digits).
 */
export function MoneyInput({ name, value, defaultValue, onValueChange, inputMode, ...props }: Props) {
  const [display, setDisplay] = React.useState(() => format(String(value ?? defaultValue ?? "")));

  // Keep in sync when a controlled `value` changes from the outside.
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
