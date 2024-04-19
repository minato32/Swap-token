"use client";

import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const NAV_LINKS = ["Trade", "Bridge", "Docs"];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <span className="text-xl font-heading font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            CrossChain
          </span>

          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <span
                key={link}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)]
                  hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
              >
                {link}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
