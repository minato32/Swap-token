"use client";

import { HTMLAttributes, ReactNode } from "react";

type CardVariant = "solid" | "glass" | "gradient" | "outline";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
  children: ReactNode;
}

const paddingStyles = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export function Card({
  variant = "solid",
  padding = "md",
  hoverable = false,
  children,
  className = "",
  style,
  ...props
}: CardProps) {
  const base = `rounded-2xl transition-theme ${paddingStyles[padding]} ${hoverable ? "hover:scale-[1.01] transition-transform duration-200" : ""}`;

  const variantInline: React.CSSProperties = { ...style };

  switch (variant) {
    case "solid":
      variantInline.backgroundColor = "var(--bg-card)";
      variantInline.border = "1px solid var(--border-primary)";
      break;
    case "glass":
      break;
    case "gradient":
      variantInline.background = "var(--gradient-card)";
      variantInline.border = "1px solid var(--border-primary)";
      break;
    case "outline":
      variantInline.backgroundColor = "transparent";
      variantInline.border = "1.5px solid var(--border-secondary)";
      break;
  }

  return (
    <div
      className={`${base} ${variant === "glass" ? "glass" : ""} ${className}`}
      style={variantInline}
      {...props}
    >
      {children}
    </div>
  );
}
