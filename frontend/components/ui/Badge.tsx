"use client";

import { ReactNode } from "react";

type BadgeVariant = "success" | "error" | "warning" | "info" | "purple" | "pink";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantMap: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: "var(--color-success-50)", text: "var(--color-success-600)" },
  error: { bg: "var(--color-error-50)", text: "var(--color-error-600)" },
  warning: { bg: "var(--color-warning-50)", text: "var(--color-warning-600)" },
  info: { bg: "var(--color-blue-50)", text: "var(--color-blue-600)" },
  purple: { bg: "var(--color-purple-100)", text: "var(--color-purple-700)" },
  pink: { bg: "var(--color-pink-100)", text: "var(--color-pink-700)" },
};

export function Badge({ variant = "info", children, className = "" }: BadgeProps) {
  const colors = variantMap[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-heading font-medium ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {children}
    </span>
  );
}
