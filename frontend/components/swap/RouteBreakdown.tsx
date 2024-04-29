"use client";

import { useState } from "react";

interface RouteBreakdownProps {
  fromSymbol: string;
  toSymbol: string;
  fromChain: string;
  toChain: string;
  fee: string;
  swapType?: "same-chain" | "cross-chain";
  activeStep?: number;
}

const TOKEN_ICONS: Record<string, string> = {
  ETH: "/tokens/ethereum-eth.png",
  MATIC: "/tokens/MAtic.png",
  BNB: "/tokens/Binance-Coin.png",
  USDC: "/tokens/USD_Coin_logo_(cropped).png",
};

const CROSS_CHAIN_ICONS = [
  // Source Token — wallet
  <svg key="0" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 010-4h14v4" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 5v14a2 2 0 002 2h16v-5" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 12a2 2 0 100 4h4v-4h-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  // SwapRouter — swap arrows
  <svg key="1" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 7H4" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 21l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 17h16" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  // LayerZero Bridge — lightning bolt
  <svg key="2" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  // TokenVault — lock
  <svg key="3" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  // Destination — check circle
  <svg key="4" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" /><polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" /></svg>,
];

const SAME_CHAIN_ICONS = [
  // Source Token — wallet
  <svg key="0" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 010-4h14v4" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 5v14a2 2 0 002 2h16v-5" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 12a2 2 0 100 4h4v-4h-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  // SwapRouter — swap arrows
  <svg key="1" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 7H4" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 21l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 17h16" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  // Uniswap V3 — refresh/cycle
  <svg key="2" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" strokeLinecap="round" strokeLinejoin="round" /><polyline points="1 20 1 14 7 14" strokeLinecap="round" strokeLinejoin="round" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  // Destination — check circle
  <svg key="3" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" /><polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" /></svg>,
];

export function RouteBreakdown(props: RouteBreakdownProps) {
  const [expanded, setExpanded] = useState(false);
  const activeStep = props.activeStep ?? -1;

  const isSameChain = props.swapType === "same-chain";

  const steps = isSameChain
    ? [
        { label: "Source", detail: props.fromSymbol, sub: props.fromChain },
        { label: "SwapRouter", detail: "Fee deducted", sub: "Protocol fee" },
        { label: "Uniswap V3", detail: "Swap", sub: "On-chain DEX" },
        { label: "Destination", detail: props.toSymbol, sub: props.fromChain },
      ]
    : [
        { label: "Source", detail: props.fromSymbol, sub: props.fromChain },
        { label: "SwapRouter", detail: "0.3% fee", sub: "Fee deducted" },
        { label: "LayerZero", detail: "Bridge", sub: `${props.fromChain} → ${props.toChain}` },
        { label: "TokenVault", detail: "Release", sub: "Tokens unlocked" },
        { label: "Destination", detail: props.toSymbol, sub: props.toChain },
      ];

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
        {expanded ? "Hide route" : "Show route"}
      </button>

      {expanded && (
        <div className="mt-4 relative">
          {/* Progress Bar Background — hidden on mobile (vertical layout) */}
          <div className="hidden md:block absolute top-5 left-[10%] right-[10%] h-[2px] bg-[var(--color-border)]" />

          {/* Active Progress — hidden on mobile */}
          {activeStep >= 0 && (
            <div
              className="hidden md:block absolute top-5 left-[10%] h-[2px] bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] transition-all duration-700"
              style={{ width: `${Math.min(activeStep / (steps.length - 1), 1) * 80}%` }}
            />
          )}

          {/* Steps — vertical on mobile, horizontal on desktop */}
          <div className="relative flex flex-col md:flex-row items-start md:items-start md:justify-between gap-3 md:gap-0">
            {steps.map((step, i) => {
              const isCompleted = i <= activeStep;
              const isActive = i === activeStep;
              const isPending = i > activeStep && activeStep >= 0;

              return (
                <div key={step.label} className={`flex flex-row md:flex-col items-center gap-3 md:gap-0 ${isSameChain ? "md:w-[25%]" : "md:w-[20%]"}`}>
                  {/* Step Circle */}
                  <div
                    className={`relative w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full flex items-center justify-center transition-all duration-500
                      ${isActive
                        ? "bg-[var(--color-primary)] text-black shadow-[0_0_20px_rgba(208,188,255,0.5)] scale-110"
                        : isCompleted
                          ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/40"
                          : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                      }
                      ${isPending ? "opacity-40" : "opacity-100"}`}
                  >
                    {isCompleted && !isActive ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      (isSameChain ? SAME_CHAIN_ICONS : CROSS_CHAIN_ICONS)[i]
                    )}

                    {/* Active Pulse Ring */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-full border-2 border-[var(--color-primary)] animate-ping opacity-30" />
                    )}
                  </div>

                  {/* Label + Detail */}
                  <div className="flex flex-col md:items-center md:mt-2">
                    <p className={`text-[11px] md:text-[10px] font-heading font-bold text-left md:text-center transition-colors
                      ${isActive ? "text-[var(--color-primary)]" : isCompleted ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] opacity-50"}`}>
                      {step.label}
                    </p>
                    <p className={`text-[10px] md:text-[9px] text-left md:text-center mt-0.5 transition-colors
                      ${isActive ? "text-[var(--color-secondary)]" : "text-[var(--color-text-secondary)] opacity-40"}`}>
                      {step.detail}
                  </p>

                    {/* Sub Detail */}
                    <p className="text-[9px] md:text-[8px] text-[var(--color-text-secondary)] opacity-30 text-left md:text-center mt-0.5">
                      {step.sub}
                    </p>
                  </div>

                  {/* Token Icon for first and last */}
                  {(i === 0 || i === steps.length - 1) && TOKEN_ICONS[step.detail] && (
                    <img
                      src={TOKEN_ICONS[step.detail]}
                      alt={step.detail}
                      className={`w-5 h-5 rounded-full mt-1.5 transition-opacity ${isActive || isCompleted ? "opacity-80" : "opacity-20"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
