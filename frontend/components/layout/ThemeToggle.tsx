"use client";

import { useThemeContext } from "../../providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full transition-theme cursor-pointer"
      style={{
        backgroundColor: theme === "dark" ? "var(--bg-tertiary)" : "var(--border-primary)",
      }}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span
        className="absolute top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-sm transition-all duration-300"
        style={{
          left: theme === "dark" ? "calc(100% - 26px)" : "2px",
          backgroundColor: theme === "dark" ? "var(--accent-primary)" : "var(--accent-secondary)",
          color: "white",
        }}
      >
        {theme === "dark" ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
