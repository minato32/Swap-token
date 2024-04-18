"use client";

import { ReactNode, useState } from "react";

interface TooltipProps {
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  children: ReactNode;
}

const positionStyles = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export function Tooltip({ content, position = "top", children }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 px-3 py-1.5 text-xs font-body whitespace-nowrap rounded-lg pointer-events-none ${positionStyles[position]}`}
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-primary)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
