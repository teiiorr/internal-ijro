import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-[-0.005em] " +
  "transition-[background-color,color,border-color,box-shadow,transform] duration-200 " +
  "focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:translate-y-[0.5px] active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] " +
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_14px_-2px_rgba(94,99,224,0.45),0_1px_2px_rgba(15,17,28,0.10)] " +
          "hover:bg-[var(--primary-hover)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_8px_22px_-4px_rgba(94,99,224,0.55),0_1px_2px_rgba(15,17,28,0.10)]",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] " +
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_14px_-2px_rgba(220,38,38,0.45)] hover:brightness-110",
        outline:
          "border border-[var(--border-strong)] bg-[var(--glass-fill-strong)] backdrop-blur-xl backdrop-saturate-180 text-[var(--foreground)] " +
          "shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_4px_14px_-4px_rgba(15,17,28,0.08)] " +
          "hover:bg-[var(--background-elevated)]",
        secondary:
          "bg-[var(--surface-3)] text-[var(--secondary-foreground)] backdrop-blur-xl hover:bg-[var(--secondary)]",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--surface-3)]",
        link:
          "text-[var(--primary)] underline-offset-4 hover:underline px-0 h-auto rounded-none",
        soft:
          "bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary-soft-strong)]",
        glass:
          "bg-[var(--glass-fill)] backdrop-blur-xl backdrop-saturate-180 border border-[var(--glass-border)] text-[var(--foreground)] " +
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_14px_-4px_rgba(15,17,28,0.08)] hover:bg-[var(--glass-fill-strong)]",
      },
      size: {
        default: "h-12 px-5 text-[15px]",
        sm:      "h-10 px-4 text-sm",
        lg:      "h-13 px-6 text-base",
        xl:      "h-14 px-7 text-lg",
        icon:    "h-12 w-12",
        "icon-sm": "h-10 w-10",
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
