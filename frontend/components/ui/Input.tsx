"use client";

import { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? "w-full" : ""}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="font-heading text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </label>
      )}
      <div
        className="relative flex items-center rounded-xl transition-theme"
        style={{
          backgroundColor: "var(--bg-input)",
          border: `1.5px solid ${error ? "var(--color-error-500)" : "var(--border-primary)"}`,
        }}
      >
        {leftIcon && (
          <span className="pl-3 flex items-center" style={{ color: "var(--text-tertiary)" }}>
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full bg-transparent px-3 py-2.5 text-base font-body outline-none placeholder:opacity-50 ${leftIcon ? "pl-1" : ""} ${rightIcon ? "pr-1" : ""} ${className}`}
          style={{
            color: "var(--text-primary)",
          }}
          {...props}
        />
        {rightIcon && (
          <span className="pr-3 flex items-center" style={{ color: "var(--text-tertiary)" }}>
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <span className="text-xs font-body" style={{ color: "var(--color-error-500)" }}>
          {error}
        </span>
      )}
      {hint && !error && (
        <span className="text-xs font-body" style={{ color: "var(--text-tertiary)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}
