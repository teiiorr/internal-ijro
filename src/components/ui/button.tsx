import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium tracking-[-0.005em] " +
  "transition-[background-color,color,border-color,box-shadow,transform] duration-150 " +
  "focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:translate-y-[0.5px]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_2px_rgba(15,17,28,0.08)] " +
          "hover:bg-[var(--primary-hover)]",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] " +
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_2px_rgba(15,17,28,0.08)] hover:brightness-110",
        outline:
          "border border-[var(--border-strong)] bg-[var(--background-elevated)] text-[var(--foreground)] " +
          "shadow-[0_1px_0_rgba(15,17,28,0.02)] hover:bg-[var(--surface-2)]",
        secondary:
          "bg-[var(--surface-3)] text-[var(--secondary-foreground)] hover:bg-[var(--border)]",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--surface-3)]",
        link:
          "text-[var(--primary)] underline-offset-4 hover:underline px-0 h-auto",
        soft:
          "bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary-soft-strong)]",
      },
      size: {
        default: "h-10 px-4 text-sm",
        sm:      "h-9 px-3 text-sm",
        lg:      "h-11 px-5 text-[15px]",
        xl:      "h-12 px-6 text-base",
        icon:    "h-10 w-10",
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
