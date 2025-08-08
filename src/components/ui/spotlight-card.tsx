"use client";

import React, { useEffect, useRef } from "react";

type GlowColor = "blue" | "purple" | "green" | "red" | "orange";
type GlowSize = "sm" | "md" | "lg";

export interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: GlowColor;
  size?: GlowSize;
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
  showBorder?: boolean; // when false, wrapper border is transparent so inner card styling dominates
}

// Restrict all variants to an orange/yellow hue only
const glowColorMap: Record<GlowColor, { base: number; spread: number }> = {
  blue: { base: 35, spread: 0 },
  purple: { base: 35, spread: 0 },
  green: { base: 35, spread: 0 },
  red: { base: 35, spread: 0 },
  orange: { base: 45, spread: 0 }, // Adjusted to match brand yellow #F6C232 (hue ~45)
};

const sizeMap: Record<GlowSize, string> = {
  sm: "w-48 h-64",
  md: "w-64 h-80",
  lg: "w-80 h-96",
};

export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = "",
  glowColor = "orange",
  size = "md",
  width,
  height,
  customSize = false,
  showBorder = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncPointer = (e: PointerEvent) => {
      const { clientX: x, clientY: y } = e;
      const root = cardRef.current;
      if (!root) return;
      root.style.setProperty("--x", x.toFixed(2));
      root.style.setProperty("--xp", (x / window.innerWidth).toFixed(2));
      root.style.setProperty("--y", y.toFixed(2));
      root.style.setProperty("--yp", (y / window.innerHeight).toFixed(2));
    };

    // Track pointer globally, but we gate opacity via hover events per-card
    document.addEventListener("pointermove", syncPointer, { passive: true });

    // Only show glow when hovering the card
    const root = cardRef.current;
    const onEnter = () => {
      if (!root) return;
      // Only enable border glows; keep interior fill off
      root.style.setProperty("--border-spot-opacity", "0.9");
      root.style.setProperty("--border-light-opacity", "0.7");
    };
    const onLeave = () => {
      if (!root) return;
      // Disable border glows
      root.style.setProperty("--border-spot-opacity", "0");
      root.style.setProperty("--border-light-opacity", "0");
    };
    root?.addEventListener("mouseenter", onEnter, { passive: true } as any);
    root?.addEventListener("mouseleave", onLeave, { passive: true } as any);

    return () => {
      document.removeEventListener("pointermove", syncPointer);
      root?.removeEventListener("mouseenter", onEnter as any);
      root?.removeEventListener("mouseleave", onLeave as any);
    };
  }, []);

  const { base, spread } = glowColorMap[glowColor];

  const getSizeClasses = (): string => {
    if (customSize) return "";
    return sizeMap[size];
  };

  const getInlineStyles = () => {
    // Use explicit type to allow CSS custom properties without any
    const styles: React.CSSProperties & Record<string, string | number> = {
      ["--base"]: base,
      ["--spread"]: spread,
      ["--radius"]: 12, // match Tailwind rounded-xl (0.75rem)
      ["--border"]: showBorder ? 1 : 1, // match inner card 1px border exactly
      ["--backup-border"]: "#e5e7eb", // Tailwind border-gray-200 so wrapper renders the single grey border
      // Interior glow disabled; we only keep border glows
      ["--bg-spot-opacity"]: 0,
      ["--border-spot-opacity"]: 0,
      ["--border-light-opacity"]: 0,
      ["--size"]: 300,
      ["--outer"]: 1,
      ["--border-size"]: "calc(var(--border, 2) * 1px)",
      ["--spotlight-size"]: "calc(var(--size, 150) * 1px)",
      ["--hue"]: "calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))",
      // No interior glow; only border glows via pseudo-elements
      backgroundImage: "none",
      backgroundSize:
        "calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))",
      backgroundPosition: "50% 50%",
      backgroundAttachment: "fixed",
      border: "var(--border-size) solid var(--backup-border)",
      position: "relative",
      isolation: "isolate",
      willChange: "background-image, filter",
      touchAction: "none",
    };

    if (width !== undefined) {
      styles.width = typeof width === "number" ? `${width}px` : width;
    }
    if (height !== undefined) {
      styles.height = typeof height === "number" ? `${height}px` : height;
    }

    return styles;
  };

  const beforeAfterStyles = `
    [data-glow]::before,
    [data-glow]::after {
      pointer-events: none;
      content: "";
      position: absolute;
      inset: calc(var(--border-size) * -0.98);
      border: var(--border-size) solid transparent;
      border-radius: calc(var(--radius) * 1px);
      background-attachment: fixed;
      background-size: calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
      background-repeat: no-repeat;
      background-position: 50% 50%;
      mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
      mask-clip: padding-box, border-box;
      mask-composite: intersect;
    }
    
    [data-glow]::before {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.75) calc(var(--spotlight-size) * 0.75) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        rgba(246, 194, 50, var(--border-spot-opacity, 0)), transparent 100%
      );
      filter: brightness(1.2) blur(1px);
      z-index: 1;
    }
    
    [data-glow]::after {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(0 0% 100% / var(--border-light-opacity, 0)), transparent 100%
      );
      z-index: 1;
    }
    
    [data-glow] [data-glow] {
      position: absolute;
      inset: 0;
      will-change: filter;
      opacity: var(--outer, 1);
      border-radius: calc(var(--radius) * 1px);
      border-width: calc(var(--border-size) * 14);
      filter: blur(calc(var(--border-size) * 7));
      background: none;
      pointer-events: none;
      border: none;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: beforeAfterStyles }} />
      <div
        ref={cardRef}
        data-glow
        style={getInlineStyles()}
        className={[
          getSizeClasses(),
          !customSize ? "aspect-[3/4]" : "",
          // Intentionally leave out drop-shadows and backdrop blur to match design system
          "group rounded-2xl relative grid grid-rows-[1fr_auto] p-0 overflow-visible",
          className,
        ].join(" ")}
      >
        {/* Inner blur ring for border glow */}
        <div ref={innerRef} data-glow></div>
        {children}
      </div>
    </>
  );
};

export default GlowCard;

