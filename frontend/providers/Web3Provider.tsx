"use client";

import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { wagmiConfig } from "@/config/wagmi";
import { useThemeContext } from "./ThemeProvider";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
  const { theme } = useThemeContext();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={theme === "dark" ? darkTheme({
            accentColor: "#8B5CF6",
            borderRadius: "medium",
          }) : lightTheme({
            accentColor: "#8B5CF6",
            borderRadius: "medium",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
