"use client";

import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { NetworkBanner } from "@/components/wallet/NetworkBanner";

export function Header() {
  return (
    <>
      <NetworkBanner />
      <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-xl font-heading font-bold bg-gradient-to-r from-[#d0bcff] to-[#ffb0cd] bg-clip-text text-transparent">
            CrossChain
          </span>

          <div className="flex items-center gap-3">
            <ConnectWalletButton />
          </div>
        </div>
      </header>
    </>
  );
}
