"use client";

interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className = "" }: DividerProps) {
  if (label) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-primary)" }} />
        <span
          className="text-xs font-heading font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          {label}
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-primary)" }} />
      </div>
    );
  }

  return (
    <div
      className={`h-px w-full ${className}`}
      style={{ backgroundColor: "var(--border-primary)" }}
    />
  );
}
