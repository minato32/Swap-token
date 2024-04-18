"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonSize = "sm" | "md" | "lg";
type IconButtonVariant = "ghost" | "solid" | "outline";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  label: string;
}

const sizeStyles = {
  sm: "w-7 h-7 text-sm",
  md: "w-9 h-9 text-base",
  lg: "w-11 h-11 text-lg",
};

export function IconButton({
  icon,
  size = "md",
  variant = "ghost",
  label,
  className = "",
  style,
  ...props
}: IconButtonProps) {
  const inlineStyle: React.CSSProperties = { ...style };

  switch (variant) {
    case "solid":
      inlineStyle.backgroundColor = "var(--bg-tertiary)";
      inlineStyle.color = "var(--text-primary)";
      break;
    case "outline":
      inlineStyle.backgroundColor = "transparent";
      inlineStyle.border = "1.5px solid var(--border-secondary)";
      inlineStyle.color = "var(--text-secondary)";
      break;
    case "ghost":
      inlineStyle.backgroundColor = "transparent";
      inlineStyle.color = "var(--text-secondary)";
      break;
  }

  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl cursor-pointer transition-theme hover:opacity-70 ${sizeStyles[size]} ${className}`}
      style={inlineStyle}
      aria-label={label}
      {...props}
    >
      {icon}
    </button>
  );
}
