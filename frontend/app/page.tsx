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

  const [selectedFloatingToken, setSelectedFloatingToken] = useState<{
    chainId: number;
    symbol: string;
  } | null>(null);

  function handleSwapSuccess(txHash: string, srcChain: string, dstChain: string) {
    setActiveTx({ hash: txHash, srcChain, dstChain });
  }

  const TOKEN_CHAIN_MAP: Record<string, number> = {
    ETH: 11155111,
    USDC: 11155111,
    MATIC: 80002,
    BNB: 97,
  };

  return (
    <main className="relative min-h-screen md:h-screen pt-14 md:pt-16 flex flex-col bg-[var(--color-surface-lowest)] text-[var(--color-text-primary)] overflow-x-hidden overflow-y-auto md:overflow-hidden font-body">
      {/* Ambient Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#8b5cf6]/[0.06] blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#ec4899]/[0.05] blur-[140px]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-[#3b82f6]/[0.03] blur-[120px] -translate-x-1/2" />
      </div>

      {/* Grid Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          backgroundImage: `
            linear-gradient(rgba(208, 188, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(208, 188, 255, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 75%)",
        }}
      />

      {/* Floating Token Icons — hidden below 1024px */}
      <div className="hidden lg:block fixed inset-0 overflow-hidden z-20" aria-hidden="true" style={{ pointerEvents: "none" }}>
        {[
          // Row 1 — top edge
          { token: "ETH", icon: "/tokens/ethereum-eth.png", color: "rgb(98, 126, 234)", top: "4%", left: "5%", size: 60, rotate: 15, floatDur: "8s", rotateDur: "12s" },
          { token: "USDC", icon: "/tokens/USD_Coin_logo_(cropped).png", color: "rgb(38, 138, 255)", top: "3%", left: "48%", size: 32, rotate: -8, floatDur: "5.5s", rotateDur: "14s" },
          { token: "BNB", icon: "/tokens/Binance-Coin.png", color: "rgb(243, 186, 47)", top: "6%", left: "82%", size: 46, rotate: 12, floatDur: "7s", rotateDur: "13s" },
          // Row 2 — upper area
          { token: "MATIC", icon: "/tokens/MAtic.png", color: "rgb(130, 71, 229)", top: "18%", left: "22%", size: 34, rotate: -15, floatDur: "6s", rotateDur: "15s" },
          { token: "ETH", icon: "/tokens/ethereum-eth.png", color: "rgb(98, 126, 234)", top: "16%", left: "72%", size: 38, rotate: 20, floatDur: "7.5s", rotateDur: "11s" },
          // Row 3 — flanking swap card
          { token: "BNB", icon: "/tokens/Binance-Coin.png", color: "rgb(243, 186, 47)", top: "36%", left: "2%", size: 50, rotate: -18, floatDur: "9s", rotateDur: "11s" },
          { token: "USDC", icon: "/tokens/USD_Coin_logo_(cropped).png", color: "rgb(38, 138, 255)", top: "34%", left: "92%", size: 44, rotate: 10, floatDur: "6.5s", rotateDur: "16s" },
          // Row 4 — below swap card
          { token: "MATIC", icon: "/tokens/MAtic.png", color: "rgb(130, 71, 229)", top: "56%", left: "4%", size: 42, rotate: 22, floatDur: "7s", rotateDur: "10s" },
          { token: "ETH", icon: "/tokens/ethereum-eth.png", color: "rgb(98, 126, 234)", top: "54%", left: "90%", size: 52, rotate: -12, floatDur: "8s", rotateDur: "14s" },
          // Row 5 — lower area
          { token: "BNB", icon: "/tokens/Binance-Coin.png", color: "rgb(243, 186, 47)", top: "70%", left: "18%", size: 36, rotate: 8, floatDur: "6s", rotateDur: "13s" },
          { token: "MATIC", icon: "/tokens/MAtic.png", color: "rgb(130, 71, 229)", top: "68%", left: "60%", size: 30, rotate: -20, floatDur: "5.5s", rotateDur: "15s" },
          { token: "USDC", icon: "/tokens/USD_Coin_logo_(cropped).png", color: "rgb(38, 138, 255)", top: "72%", left: "85%", size: 40, rotate: 14, floatDur: "7.5s", rotateDur: "12s" },
          // Row 6 — bottom edge
          { token: "ETH", icon: "/tokens/ethereum-eth.png", color: "rgb(98, 126, 234)", top: "86%", left: "8%", size: 48, rotate: -10, floatDur: "8.5s", rotateDur: "11s" },
          { token: "MATIC", icon: "/tokens/MAtic.png", color: "rgb(130, 71, 229)", top: "88%", left: "45%", size: 44, rotate: 18, floatDur: "6.5s", rotateDur: "14s" },
          { token: "BNB", icon: "/tokens/Binance-Coin.png", color: "rgb(243, 186, 47)", top: "84%", left: "78%", size: 38, rotate: -16, floatDur: "7s", rotateDur: "12s" },
        ].map((item, i) => (
          <div
            key={i}
            className="floating-token"
            onClick={() => setSelectedFloatingToken({
              chainId: TOKEN_CHAIN_MAP[item.token],
              symbol: item.token,
            })}
            style={{
              position: "absolute",
              top: item.top,
              left: item.left,
              width: item.size + 20,
              height: item.size + 20,
              padding: 10,
              animation: `cloud-float ${item.floatDur} linear infinite`,
            }}
          >
            {/* Glow + icon */}
            <div
              className="token-glow"
              style={{
                width: item.size,
                height: item.size,
                borderRadius: "50%",
                backgroundSize: "contain",
                backgroundPosition: "center center",
                backgroundRepeat: "no-repeat",
                backgroundImage: `url('${item.icon}')`,
                backgroundColor: item.color,
                filter: `blur(${item.size * 0.1}px)`,
                opacity: 0.6,
                transform: `scale(1) rotate(${item.rotate}deg)`,
                transformOrigin: "center center",
                position: "relative",
              }}
            >
              {/* Ring 1 */}
              <div
                className="token-ring token-ring-1"
                style={{
                  position: "absolute",
                  inset: -8,
                  borderRadius: "50%",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: item.color,
                  opacity: 0,
                  transform: "scale(1)",
                  transformOrigin: "center center",
                }}
              />
              {/* Ring 2 */}
              <div
                className="token-ring token-ring-2"
                style={{
                  position: "absolute",
                  inset: -16,
                  borderRadius: "50%",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: item.color,
                  opacity: 0,
                  transform: "scale(1)",
                  transformOrigin: "center center",
                }}
              />
            </div>
            {/* Label */}
            <div
              className="token-label"
              style={{
                position: "absolute",
                left: item.size + 24,
                top: "50%",
                transform: "translateY(-50%)",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.75)" }}>
                {item.token}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Header />

      {/* Main App */}
      <section className="relative z-10 flex items-center justify-center px-4 py-4 flex-1">
        <div className="flex flex-col items-center">
          <h1 className="text-xl md:text-2xl md:text-4xl font-heading font-bold mb-3 md:mb-5 tracking-tight">
            <span className="bg-gradient-to-r from-[#d0bcff] to-[#ffb0cd] bg-clip-text text-transparent">DeFi</span>{" "}
            <span className="text-[var(--color-text-primary)]">Without Borders.</span>
          </h1>

          {/* Swap Card */}
          <div className="glow-border w-full max-w-[780px] mx-auto bg-[var(--color-surface-low)] rounded-3xl border border-[var(--color-border)] p-4">
            {activeTx ? (
              <TransactionStatus
                txHash={activeTx.hash}
                srcChain={activeTx.srcChain}
                dstChain={activeTx.dstChain}
                onClose={() => setActiveTx(null)}
              />
            ) : (
              <SwapCard onSwapSuccess={handleSwapSuccess} initialFromToken={selectedFloatingToken} />
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
            <span>0% Fee on Same-Chain</span>
            <span>|</span>
            <span>Uniswap V3 Powered</span>
            <span>|</span>
            <span>LayerZero V2 Bridge</span>
            <span>|</span>
            <span>Security Audited</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--color-border)] py-3 md:py-4 px-3 md:px-4">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
          <img src="/Logo (2).svg" alt="CrossChain Swap" className="hidden md:block h-5" />
          <div className="flex items-center gap-4 md:gap-6 text-[10px] md:text-[11px] text-[var(--color-text-secondary)] opacity-50">
            <a href="https://github.com/minato32" target="_blank" rel="noopener noreferrer" className="hover:text-[#d0bcff] transition-colors">GitHub</a>
            <a href="https://docs.uniswap.org" target="_blank" rel="noopener noreferrer" className="hover:text-[#d0bcff] transition-colors">Uniswap Docs</a>
            <a href="https://docs.layerzero.network" target="_blank" rel="noopener noreferrer" className="hover:text-[#d0bcff] transition-colors">LayerZero Docs</a>
          </div>
          <span className="text-[9px] md:text-[10px] text-[var(--color-text-secondary)] opacity-30 text-center">
            Built with Solidity · Next.js · LayerZero V2 · Uniswap V3
          </span>
        </div>
      </footer>
    </main>
  );
}
