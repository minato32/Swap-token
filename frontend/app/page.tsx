"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { SwapCard } from "@/components/swap/SwapCard";
import { TransactionStatus } from "@/components/swap/TransactionStatus";

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
    <main className="relative min-h-screen bg-[var(--color-surface-lowest)] text-[var(--color-text-primary)] overflow-x-hidden font-body">
      {/* Ambient Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#8b5cf6]/[0.06] blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#ec4899]/[0.05] blur-[140px]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-[#3b82f6]/[0.03] blur-[120px] -translate-x-1/2" />
      </div>

      {/* Floating Token Icons */}
      <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none" aria-hidden="true">
        {[
          { token: "ETH", icon: "/tokens/ethereum-eth.png", top: "8%", left: "8%", size: 96, opacity: 0.06, blur: 8, anim: "animate-float-slow", delay: "0s" },
          { token: "USDC", icon: "/tokens/USD_Coin_logo_(cropped).png", top: "12%", left: "78%", size: 40, opacity: 0.12, blur: 0, anim: "animate-float-medium", delay: "-2s" },
          { token: "MATIC", icon: "/tokens/MAtic.png", top: "40%", left: "5%", size: 64, opacity: 0.08, blur: 4, anim: "animate-float-fast", delay: "-1s" },
          { token: "BNB", icon: "/tokens/Binance-Coin.png", top: "35%", left: "88%", size: 36, opacity: 0.1, blur: 0, anim: "animate-float-slow", delay: "-3s" },
          { token: "ETH", icon: "/tokens/ethereum-eth.png", top: "65%", left: "82%", size: 80, opacity: 0.05, blur: 10, anim: "animate-float-medium", delay: "-4s" },
          { token: "USDC", icon: "/tokens/USD_Coin_logo_(cropped).png", top: "70%", left: "12%", size: 56, opacity: 0.07, blur: 6, anim: "animate-float-fast", delay: "-2.5s" },
          { token: "MATIC", icon: "/tokens/MAtic.png", top: "18%", left: "25%", size: 28, opacity: 0.09, blur: 0, anim: "animate-float-medium", delay: "-1.5s" },
          { token: "BNB", icon: "/tokens/Binance-Coin.png", top: "75%", left: "65%", size: 32, opacity: 0.06, blur: 3, anim: "animate-float-slow", delay: "-5s" },
          { token: "ETH", icon: "/tokens/ethereum-eth.png", top: "50%", left: "92%", size: 44, opacity: 0.07, blur: 2, anim: "animate-float-fast", delay: "-3.5s" },
          { token: "MATIC", icon: "/tokens/MAtic.png", top: "85%", left: "40%", size: 48, opacity: 0.05, blur: 5, anim: "animate-float-medium", delay: "-4.5s" },
        ].map((item, i) => (
          <div
            key={i}
            className="group pointer-events-auto absolute cursor-pointer"
            style={{ top: item.top, left: item.left }}
          >
            <img
              src={item.icon}
              alt={item.token}
              className={`${item.anim} rounded-full object-cover`}
              style={{
                width: item.size,
                height: item.size,
                opacity: item.opacity,
                filter: item.blur ? `blur(${item.blur}px)` : "none",
                animationDelay: item.delay,
                willChange: "transform",
              }}
            />
            <div className="absolute left-1/2 -translate-x-1/2 mt-1 px-2.5 py-1 bg-[var(--color-surface-low)] border border-[var(--color-border)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
              <span className="text-[10px] font-bold text-[var(--color-text-primary)]">{item.token}</span>
            </div>
          </div>
        ))}
      </div>

      <Header />

      {/* Main App */}
      <section className="relative z-10 flex items-center justify-center px-4 py-8 min-h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center">
          <p className="text-sm font-medium mb-5 tracking-wide">
            <span className="text-[#d0bcff]">Cross-Chain Swaps;</span>{" "}
            <span className="text-[var(--color-text-primary)]">Not Boundaries.</span>
          </p>

          {/* Swap Card */}
          <div className="w-full max-w-[780px] mx-auto bg-[var(--color-surface-low)] rounded-3xl border border-[var(--color-border)] p-4">
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
          </div>

          {/* Supported Chains */}
          <div className="mt-8 flex items-center gap-5">
            {[
              { name: "Ethereum", icon: "/chains/Sepolia eth.png" },
              { name: "Polygon", icon: "/chains/Amoy-polygon.webp" },
              { name: "BNB Chain", icon: "/chains/BSC-BNB.png" },
            ].map((chain) => (
              <div key={chain.name} className="flex items-center gap-2 opacity-40 hover:opacity-70 transition-opacity">
                <img src={chain.icon} alt={chain.name} className="w-4 h-4 rounded-full object-cover" />
                <span className="text-[11px] font-label text-[var(--color-text-secondary)]">{chain.name}</span>
              </div>
            ))}
          </div>

          {/* Protocol Info */}
          <div className="mt-6 flex items-center gap-4 text-[10px] font-label text-[var(--color-text-secondary)] opacity-30">
            <span>0.3% Protocol Fee</span>
            <span>|</span>
            <span>LayerZero Bridge</span>
            <span>|</span>
            <span>Slither Audited</span>
          </div>
        </div>
      </section>
    </main>
  );
}
