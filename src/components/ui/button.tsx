import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Barcha tugmalar BIIB `.ui-button` materialida: shakl (radius 12, konsentrik),
 * yaltiroq (glare) va press/hover animatsiya (scale .97) — shakl va harakat ui.css
 * (.ui-button) + materials.css'dan keladi. Rang koʻk (--tint; foydalanuvchi override'i).
 * Eski variant/oʻlcham nomlari saqlanadi — mavjud consumer'lar oʻzgarmaydi.
 */
const buttonVariants = cva(
  "ui-button relative inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap font-semibold",
  {
    variants: {
      variant: {
        default: "text-on-tint",
        accent: "text-on-tint",
        destructive: "text-on-tint",
        success: "text-on-tint",
        outline: "material text-material-ink",
        secondary: "material text-material-ink",
        glass: "material text-material-ink",
        ghost: "text-ink",
        soft: "text-ink",
        link: "text-tint underline decoration-1 underline-offset-4",
      },
      size: {
        default: "t-label-l",
        sm: "t-label",
        lg: "t-label-l",
        xl: "t-label-l",
        icon: "",
        "icon-sm": "",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

// Eski variant → BIIB data-variant (primary/glass/ghost/link).
const DATA_VARIANT = {
  default: "primary",
  accent: "primary",
  destructive: "primary",
  success: "primary",
  outline: "glass",
  secondary: "glass",
  glass: "glass",
  ghost: "ghost",
  soft: "ghost",
  link: "link",
} as const;

// Eski oʻlcham → BIIB data-size (40/48/56; 48 = standart, data-size yoʻq).
const DATA_SIZE: Record<string, "40" | "56" | undefined> = {
  default: undefined,
  lg: "56",
  xl: "56",
  sm: "40",
  icon: undefined,
  "icon-sm": "40",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const v = (variant ?? "default") as keyof typeof DATA_VARIANT;
    const s = (size ?? "default") as string;
    const dataVariant = DATA_VARIANT[v];
    // destructive/success — bir xil primary shakl, faqat tus (--tint) almashtiriladi.
    const toneVar = v === "destructive" ? "var(--danger)" : v === "success" ? "var(--success)" : undefined;
    const mergedStyle = toneVar
      ? ({ ["--tint" as string]: toneVar, ...style } as React.CSSProperties)
      : style;
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        data-variant={dataVariant}
        data-size={DATA_SIZE[s]}
        data-icon={s === "icon" || s === "icon-sm" ? "only" : undefined}
        data-text={dataVariant === "glass" ? "true" : undefined}
        aria-disabled={disabled ? "true" : undefined}
        disabled={disabled}
        style={mergedStyle}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
export { buttonVariants };
