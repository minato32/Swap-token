"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { NetworkBanner } from "@/components/wallet/NetworkBanner";
import { SwapCard } from "@/components/swap/SwapCard";
import { TransactionStatus } from "@/components/swap/TransactionStatus";
import { StatsSection } from "@/components/layout/StatsSection";
import { FeaturesSection } from "@/components/layout/FeaturesSection";
import { ChainsBar } from "@/components/layout/ChainsBar";

export default function Home() {
  const [activeTx, setActiveTx] = useState<{
    hash: string;
    srcChain: string;
    dstChain: string;
  } | null>(null);

  function handleSwapSuccess(txHash: string, srcChain: string, dstChain: string) {
    setActiveTx({ hash: txHash, srcChain, dstChain });
  }

  return (
    <main className="min-h-screen">
      <NetworkBanner />
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-96 h-48 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative flex flex-col items-center justify-center px-4 pt-24 pb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-center mb-4 text-[var(--color-text-primary)]">
            Swap across chains,
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              anytime.
            </span>
          </h1>

          <p className="text-[var(--color-text-secondary)] text-center text-sm sm:text-base mb-10 max-w-lg">
            Swap tokens seamlessly across Ethereum, Polygon, and BNB Chain
            with real-time tracking and battle-tested security.
          </p>

          {activeTx ? (
            <TransactionStatus
              txHash={activeTx.hash}
              srcChain={activeTx.srcChain}
              dstChain={activeTx.dstChain}
              onClose={() => setActiveTx(null)}
            />
          ) : (
            <SwapCard onSwapSuccess={handleSwapSuccess} />
          )}

          <ChainsBar />
        </div>
      </section>

      <StatsSection />
      <FeaturesSection />
      <Footer />
    </main>
  );
}
