import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-semibold tracking-[-0.005em] " +
  "transition-[background-color,color,border-color,box-shadow,transform] duration-200 " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary-glow)] " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "active:scale-[0.97] active:translate-y-[0.5px]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] " +
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_8px_22px_-4px_var(--primary-glow),0_2px_6px_rgba(99,102,241,0.20)] " +
          "hover:bg-[var(--primary-hover)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_30px_-4px_var(--primary-glow),0_4px_10px_rgba(99,102,241,0.30)] " +
          "hover:-translate-y-[1px]",
        accent:
          "bg-[var(--accent)] text-[var(--accent-foreground)] " +
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_8px_22px_-4px_var(--accent-glow),0_2px_6px_rgba(236,72,153,0.20)] " +
          "hover:bg-[var(--accent-hover)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_30px_-4px_var(--accent-glow),0_4px_10px_rgba(236,72,153,0.30)] " +
          "hover:-translate-y-[1px]",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] " +
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_22px_-4px_rgba(239,68,68,0.45)] hover:brightness-110",
        outline:
          "border border-[var(--border-strong)] glass text-[var(--foreground)] " +
          "hover:bg-[var(--glass-fill-strong)]",
        secondary:
          "glass-soft text-[var(--foreground)] hover:bg-[var(--glass-fill)]",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--glass-fill-soft)] hover:backdrop-blur",
        link:
          "text-[var(--primary)] underline-offset-4 hover:underline px-0 h-auto rounded-none",
        soft:
          "bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary-soft-strong)]",
        glass:
          "glass text-[var(--foreground)] hover:bg-[var(--glass-fill-strong)]",
      },
      size: {
        default: "h-11 px-5 text-[15px]",
        sm:      "h-9  px-3.5 text-sm",
        lg:      "h-12 px-6 text-base",
        xl:      "h-14 px-7 text-lg",
        icon:    "h-11 w-11 rounded-2xl",
        "icon-sm": "h-9 w-9 rounded-xl",
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
