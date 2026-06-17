import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium " +
  "transition-colors duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] " +
  "disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:brightness-95",
        outline:
          "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] " +
          "hover:bg-[var(--surface-2)]",
        secondary:
          "bg-[var(--surface-2)] text-[var(--secondary-foreground)] border border-[var(--border)] hover:bg-[var(--surface-3)]",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--surface-2)]",
        link:
          "text-[var(--accent)] underline-offset-4 hover:underline px-0 h-auto rounded-none",
        soft:
          "bg-[var(--primary-soft)] text-[var(--foreground)] hover:bg-[var(--surface-3)]",
      },
      size: {
        default: "h-10 px-4 text-[15px]",
        sm:      "h-9  px-3 text-sm",
        lg:      "h-11 px-5 text-[15px]",
        xl:      "h-12 px-6 text-base",
        icon:    "h-10 w-10",
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
