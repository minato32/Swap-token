"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "gradient" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "text-white transition-theme hover:opacity-90",
  secondary:
    "transition-theme hover:opacity-90",
  outline:
    "bg-transparent border-2 transition-theme hover:opacity-80",
  ghost:
    "bg-transparent transition-theme hover:opacity-80",
  gradient:
    "bg-gradient-primary text-white transition-theme hover:opacity-90",
  danger:
    "text-white transition-theme hover:opacity-90",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-base rounded-xl",
  lg: "px-7 py-3.5 text-lg rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  disabled,
  className = "",
  style,
  ...props
}: ButtonProps) {
  const baseStyle = "font-heading font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const dynamicStyles: Record<string, string> = {
    primary: "var(--accent-primary)",
    secondary: "var(--accent-secondary)",
    outline: "var(--accent-primary)",
    ghost: "var(--accent-primary)",
    gradient: "",
    danger: "var(--color-error-500)",
  };

  const inlineStyle: React.CSSProperties = { ...style };

  if (variant === "primary" || variant === "danger") {
    inlineStyle.backgroundColor = dynamicStyles[variant];
  } else if (variant === "secondary") {
    inlineStyle.backgroundColor = dynamicStyles[variant];
    inlineStyle.color = "white";
  } else if (variant === "outline") {
    inlineStyle.borderColor = dynamicStyles[variant];
    inlineStyle.color = dynamicStyles[variant];
  } else if (variant === "ghost") {
    inlineStyle.color = dynamicStyles[variant];
  }

  return (
    <button
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || isLoading}
      style={inlineStyle}
      {...props}
    >
      {isLoading ? <Spinner size={size} /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}

function Spinner({ size }: { size: ButtonSize }) {
  const sizeMap = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" };
  return (
    <svg
      className={`animate-spin ${sizeMap[size]}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
