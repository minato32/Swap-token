"use client";

import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { NetworkBanner } from "@/components/wallet/NetworkBanner";

export function Header() {
  return (
    <>
      <NetworkBanner />
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 md:h-16 max-w-6xl items-center justify-between px-3 md:px-4">
          <img src="/Logo (2).svg" alt="CrossChain Swap" className="h-5 md:h-7" />

          <div className="flex items-center gap-3">
            <ConnectWalletButton />
          </div>
        </div>
      </header>
    </>
  );
}
