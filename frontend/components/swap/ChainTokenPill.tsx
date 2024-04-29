"use client";

import { useState, useRef, useEffect } from "react";
import { SUPPORTED_CHAINS } from "@/lib/constants";
import { type Token, SUPPORTED_TOKENS } from "@/config/tokens";
import type { Chain } from "@/lib/types";

interface ChainTokenPillProps {
  chain: Chain | null;
  token: Token | null;
  onChainChange: (chain: Chain) => void;
  onTokenChange: (token: Token) => void;
  excludeChainId?: number;
  dropUp?: boolean;
}

const CHAIN_COLORS: Record<string, string> = {
  Sepolia: "#3b82f6",
  Amoy: "#8b5cf6",
  "BSC Testnet": "#f59e0b",
};

export function ChainTokenPill({
  chain,
  token,
  onChainChange,
  onTokenChange,
  excludeChainId,
  dropUp = false,
}: ChainTokenPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chain" | "token">(chain ? "token" : "chain");
  const ref = useRef<HTMLDivElement>(null);

  const chains = SUPPORTED_CHAINS.filter((c) => c.id !== excludeChainId);
  const tokens = chain ? SUPPORTED_TOKENS[chain.id] || [] : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!chain) setActiveTab("chain");
  }, [chain]);

  function handleChainSelect(c: Chain) {
    onChainChange(c);
    setActiveTab("token");
  }

  function handleTokenSelect(t: Token) {
    onTokenChange(t);
    setIsOpen(false);
  }

  const hasSelection = chain && token;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-full transition-all
          ${hasSelection
            ? "pl-2 pr-3 py-1.5 bg-[var(--color-surface-low)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40"
            : "px-4 py-2 bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary)]"
          }`}
      >
        {hasSelection ? (
          <>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: CHAIN_COLORS[chain.name] || "#6b7280" }}
            >
              {chain.name.charAt(0)}
            </div>
            <span className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">
              {token.symbol}
            </span>
            <svg className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </>
        ) : (
          <>
            <span className="font-heading font-semibold text-sm">Select token</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 w-[280px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden ${dropUp ? "bottom-full mb-2" : "mt-2"}`}
          style={{ zIndex: 100 }}
        >
          {/* Tabs */}
          <div className="flex border-b border-[var(--color-border)]">
            <button
              onClick={() => setActiveTab("chain")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors
                ${activeTab === "chain"
                  ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
            >
              Chain
            </button>
            <button
              onClick={() => chain && setActiveTab("token")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors
                ${!chain ? "opacity-30 cursor-not-allowed" : ""}
                ${activeTab === "token"
                  ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
            >
              Token
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[240px] overflow-y-auto p-2">
            {activeTab === "chain" ? (
              chains.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleChainSelect(c)}
                  className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left transition-colors
                    hover:bg-[var(--color-primary)]/5
                    ${chain?.id === c.id ? "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20" : ""}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: CHAIN_COLORS[c.name] || "#6b7280" }}
                  >
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">{c.name}</p>
                    <p className="text-[10px] text-[var(--color-text-secondary)]">{c.symbol}</p>
                  </div>
                  {chain?.id === c.id && (
                    <svg className="ml-auto w-4 h-4 text-[var(--color-primary)]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))
            ) : (
              tokens.length === 0 ? (
                <p className="text-center text-sm text-[var(--color-text-secondary)] py-8">
                  Select a chain first
                </p>
              ) : (
                tokens.map((t) => (
                  <button
                    key={t.address}
                    onClick={() => handleTokenSelect(t)}
                    className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left transition-colors
                      hover:bg-[var(--color-primary)]/5
                      ${token?.address === t.address ? "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20" : ""}`}
                  >
                    <TokenIcon symbol={t.symbol} />
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">{t.symbol}</p>
                      <p className="text-[10px] text-[var(--color-text-secondary)] truncate">{t.name}</p>
                    </div>
                    {token?.address === t.address && (
                      <svg className="ml-auto w-4 h-4 text-[var(--color-primary)]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TokenIcon({ symbol }: { symbol: string }) {
  const colors: Record<string, string> = {
    ETH: "#3b82f6",
    MATIC: "#8b5cf6",
    BNB: "#f59e0b",
    USDC: "#2775ca",
  };

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
      style={{ backgroundColor: colors[symbol] || "#6b7280" }}
    >
      {symbol.charAt(0)}
    </div>
  );
}
