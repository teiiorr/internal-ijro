import { Slot, Slottable } from "@radix-ui/react-slot";
import type { ComponentPropsWithoutRef, ComponentType, ReactNode, Ref } from "react";
import { cx } from "@/lib/cx";
import {
  BUTTON_ICON_SIZE,
  buttonVariants,
  type ButtonSize,
  type ButtonVariant,
} from "./button-variants";
import { ButtonSpinner } from "./ButtonSpinner";
import { Tooltip } from "./Tooltip";

/** @tabler/icons-react belgisi (size/stroke/className qabul qiladi). */
export type TablerIcon = ComponentType<{ size?: number; stroke?: number; className?: string }>;

interface ButtonOwnProps {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly icon?: TablerIcon;
  readonly iconPosition?: "start" | "end";
  readonly loading?: boolean;
  readonly disabled?: boolean;
  /** Nega oʻchiqligi: tooltip boʻlib chiqadi, tugma fokuslanadigan boʻlib qoladi. */
  readonly disabledReason?: string;
  readonly asChild?: boolean;
  readonly className?: string;
  readonly children?: ReactNode;
  readonly ref?: Ref<HTMLButtonElement>;
}

type NativeProps = Omit<ComponentPropsWithoutRef<"button">, keyof ButtonOwnProps | "aria-label">;

/* Faqat belgili (iconOnly) tugma nomsiz boʻlolmaydi: aria-label majburiy. */
export type ButtonProps = ButtonOwnProps &
  NativeProps &
  (
    | { readonly iconOnly: true; readonly "aria-label": string }
    | { readonly iconOnly?: false; readonly "aria-label"?: string }
  );

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "48",
    icon: IconCmp,
    iconPosition = "start",
    loading = false,
    disabled = false,
    disabledReason,
    asChild = false,
    className,
    children,
    iconOnly = false,
    onClick,
    type,
    ref,
    ...rest
  } = props;

  const inactive = disabled || loading;
  const iconSize = BUTTON_ICON_SIZE[size];
  const Component = asChild ? Slot : "button";
  const hasIcon = Boolean(IconCmp);
  const iconSlot = iconOnly ? "only" : hasIcon || loading ? iconPosition : undefined;

  const graphic = loading ? (
    <ButtonSpinner size={iconSize} />
  ) : IconCmp ? (
    <IconCmp size={iconSize} stroke={1.75} />
  ) : null;

  const element = (
    <Component
      {...rest}
      ref={ref}
      {...(asChild ? {} : { type: type ?? "button" })}
      className={cx(buttonVariants({ variant, size }), className)}
      data-variant={variant}
      data-size={size}
      data-icon={iconSlot}
      data-text={variant === "glass" ? "true" : undefined}
      aria-disabled={inactive ? "true" : undefined}
      aria-busy={loading ? "true" : undefined}
      disabled={!asChild && disabled && !disabledReason ? true : undefined}
      onClick={inactive ? undefined : onClick}
    >
      {iconSlot === "only"
        ? graphic
        : [
            graphic && iconPosition === "start" ? <span key="start">{graphic}</span> : null,
            asChild ? (
              <Slottable key="label">{children}</Slottable>
            ) : (
              <span key="label" className="text-trim">
                {children}
              </span>
            ),
            graphic && iconPosition === "end" ? <span key="end">{graphic}</span> : null,
          ]}
    </Component>
  );

  if (disabled && disabledReason) {
    return <Tooltip content={disabledReason}>{element}</Tooltip>;
  }
  return element;
}
