import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "ui-button relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap select-none",
  {
    variants: {
      variant: {
        // Fon materials.css faylida — utilita klassi uni bosib ketmasin.
        primary: "text-on-tint",
        glass: "material text-material-ink",
        ghost: "text-ink",
        link: "text-tint underline decoration-1 underline-offset-4",
      },
      size: {
        "40": "t-label",
        "48": "t-label-l",
        "56": "t-label-l",
      },
    },
    defaultVariants: { variant: "primary", size: "48" },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

/** Tugma balandligi ↔ belgi oʻlchami: 40 → 16, 48 → 20, 56 → 24. */
export const BUTTON_ICON_SIZE: Record<ButtonSize, number> = { "40": 16, "48": 20, "56": 24 };
