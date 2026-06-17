import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold tracking-tight " +
  "transition-all duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "active:translate-y-[2px] active:shadow-none",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-lift)] hover:-translate-y-[1px] hover:bg-[var(--primary-hover)]",
        accent:
          "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-lift)] hover:-translate-y-[1px] hover:bg-[var(--accent-hover)]",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] shadow-[var(--shadow-lift)] hover:-translate-y-[1px] hover:brightness-110",
        outline:
          "border-2 border-[var(--foreground)] bg-transparent text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)]",
        secondary:
          "bg-[var(--surface-2)] text-[var(--foreground)] border-2 border-[var(--border-strong)] hover:bg-[var(--surface-3)]",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--surface-2)]",
        link:
          "text-[var(--foreground)] underline underline-offset-4 decoration-2 hover:decoration-[var(--accent)] px-0 h-auto",
        soft:
          "bg-[var(--primary-soft)] text-[var(--foreground)] hover:bg-[var(--primary-soft-strong)]",
      },
      size: {
        default: "h-11 px-5 text-[15px]",
        sm:      "h-9  px-3.5 text-sm",
        lg:      "h-12 px-6 text-base",
        xl:      "h-14 px-8 text-lg",
        icon:    "h-11 w-11",
        "icon-sm": "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";
export { buttonVariants };
