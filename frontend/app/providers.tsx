"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Web3Provider } from "@/providers/Web3Provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <Web3Provider>{children}</Web3Provider>
    </ThemeProvider>
  );
}
