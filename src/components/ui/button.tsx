import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-semibold tracking-[-0.005em] " +
  "transition-[background-color,color,border-color,box-shadow,transform] duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "active:scale-[0.97] active:translate-y-[0.5px]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-1)] " +
          "hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-2)]",
        accent:
          "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-1)] " +
          "hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-2)]",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] shadow-[var(--shadow-1)] hover:brightness-105",
        success:
          "bg-[var(--success)] text-white shadow-[var(--shadow-1)] hover:brightness-105",
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
