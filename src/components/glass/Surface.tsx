"use client";

import { useCallback, useMemo, useRef } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";

import { cx } from "@/lib/cx";

import {
  RADIUS_EXPRESSION,
  SurfaceContext,
  innerRadius,
  useParentSurface,
  type SurfaceFrame,
  type SurfaceRadius,
} from "./surface-context";
import { useSurfaceTone } from "./useSurfaceTone";

export type SurfaceVariant = "regular" | "clear" | "tinted";
export type SurfacePadding = 0 | 4 | 8 | 12 | 16 | 24;
export type SurfaceTag = "div" | "span" | "button" | "nav" | "header" | "section" | "aside" | "a" | "ul" | "li";
export type { SurfaceRadius };

export interface SurfaceLight {
  readonly x: number;
  readonly y: number;
}

export interface SurfaceOwnProps {
  readonly variant?: SurfaceVariant;
  readonly text?: boolean;
  readonly as?: SurfaceTag;
  readonly radius?: SurfaceRadius;
  readonly padding?: SurfacePadding;
  readonly light?: SurfaceLight;
  readonly adaptiveTone?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly children?: ReactNode;
  readonly ref?: Ref<HTMLElement>;
}

export type SurfaceProps = SurfaceOwnProps &
  Omit<HTMLAttributes<HTMLElement>, keyof SurfaceOwnProps> & {
    readonly type?: "button" | "submit";
    readonly href?: string;
    readonly disabled?: boolean;
  };

function assignRef(ref: Ref<HTMLElement> | undefined, node: HTMLElement | null): void {
  if (!ref) return;
  if (typeof ref === "function") ref(node);
  else (ref as { current: HTMLElement | null }).current = node;
}

/**
 * Liquid Glass sirt (materials.css). Konsentrik radius qoidasi: ichki sirtlar
 * ota radiusdan paddingni ayirib oʻz radiusini hisoblaydi — "ramka ichida ramka" boʻlmaydi.
 * Sinish (refraction) effekti pardozlash bosqichida ulanadi; koʻrinishni CSS beradi.
 */
export function Surface({
  variant = "regular",
  text = false,
  as = "div",
  radius = "panel",
  padding = 0,
  light,
  adaptiveTone = false,
  className,
  style,
  children,
  ref,
  ...rest
}: SurfaceProps) {
  const parent = useParentSurface();

  const localRef = useRef<HTMLElement | null>(null);
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      localRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  useSurfaceTone(localRef, adaptiveTone);

  const frame = useMemo<SurfaceFrame>(
    () => ({ radius: parent ? innerRadius(parent) : RADIUS_EXPRESSION[radius], padding }),
    [parent, radius, padding],
  );

  const vars: Record<string, string> = {
    "--surface-radius": frame.radius,
    "--surface-padding": `${padding}px`,
  };
  if (padding > 0) vars.padding = `${padding}px`;
  if (light) {
    vars["--light-x"] = `${light.x}%`;
    vars["--light-y"] = `${light.y}%`;
  }

  const Tag = as;

  return (
    <SurfaceContext.Provider value={frame}>
      <Tag
        {...rest}
        ref={setRef}
        className={cx("surface material", className)}
        style={{ ...(vars as CSSProperties), ...style }}
        data-variant={variant}
        data-text={text ? "true" : undefined}
        data-radius={radius}
      >
        {children}
      </Tag>
    </SurfaceContext.Provider>
  );
}
