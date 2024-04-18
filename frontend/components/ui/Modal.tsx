"use client";

import { ReactNode, useEffect, useCallback } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 transition-opacity"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizeStyles[size]} rounded-2xl p-6 transition-theme`}
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-primary)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3
              className="font-heading text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-theme hover:opacity-70"
              style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
