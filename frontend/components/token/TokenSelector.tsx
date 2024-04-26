"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useBalance, useAccount } from "wagmi";
import { formatUnits } from "viem";
import { type Token, SUPPORTED_TOKENS } from "@/config/tokens";

interface TokenSelectorProps {
  chainId: number;
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  excludeAddress?: string;
  label: string;
}

export function TokenSelector({ chainId, selectedToken, onSelect, excludeAddress, label }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const allTokens = (SUPPORTED_TOKENS[chainId] || []).filter(
    (t) => !excludeAddress || t.address.toLowerCase() !== excludeAddress.toLowerCase()
  );

  const tokens = useMemo(() => {
    if (!search) return allTokens;
    const query = search.toLowerCase();
    return allTokens.filter(
      (t) => t.symbol.toLowerCase().includes(query) || t.name.toLowerCase().includes(query)
    );
  }, [chainId, search, allTokens]);

  const popularTokens = allTokens.slice(0, 3);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
    if (!isOpen) setSearch("");
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 shrink-0 rounded-full transition-colors
          ${selectedToken
            ? "px-3 py-2.5 bg-[var(--color-surface-low)] border border-[var(--color-border)] hover:border-[#d0bcff]/30"
            : "px-4 py-2.5 bg-[#d0bcff] text-black hover:bg-[#c4a8ff]"
          }`}
      >
        {selectedToken ? (
          <>
            <TokenIcon symbol={selectedToken.symbol} size={24} />
            <span className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">
              {selectedToken.symbol}
            </span>
          </>
        ) : (
          <span className="font-heading font-semibold text-sm">Select token</span>
        )}
        <svg className={`w-4 h-4 ${selectedToken ? "text-[var(--color-text-secondary)]" : "text-black/50"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Modal Overlay via Portal */}
      {isOpen && typeof window !== "undefined" ? createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 200 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

          <div className="relative w-full max-w-[400px] bg-[var(--color-surface-low)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="font-heading font-bold text-lg text-[var(--color-text-primary)]">Select a token</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center hover:bg-[var(--color-border)] transition-colors"
              >
                <svg className="w-4 h-4 text-[var(--color-text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pb-3">
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search token name or paste address"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm bg-[var(--color-surface)] border border-[var(--color-border)]
                    text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]
                    focus:outline-none focus:border-[#d0bcff]/40"
                />
              </div>
            </div>

            {/* Popular Tokens */}
            {!search && popularTokens.length > 0 && (
              <div className="px-5 pb-3 flex gap-2 flex-wrap">
                {popularTokens.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => { onSelect(token); setIsOpen(false); }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors
                      ${selectedToken?.address === token.address
                        ? "bg-[#d0bcff]/10 border-[#d0bcff]/30"
                        : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[#d0bcff]/20"
                      }`}
                  >
                    <TokenIcon symbol={token.symbol} size={20} />
                    <span className="font-heading font-semibold text-xs text-[var(--color-text-primary)]">{token.symbol}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-[var(--color-border)]" />

            {/* Token List */}
            <div className="max-h-[300px] overflow-y-auto py-2 px-2">
              {tokens.length === 0 ? (
                <p className="text-center text-sm text-[var(--color-text-secondary)] py-8">
                  {chainId === 0 ? "Select a chain first" : "No tokens found"}
                </p>
              ) : (
                tokens.map((token) => (
                  <TokenRow
                    key={token.address}
                    token={token}
                    isSelected={selectedToken?.address === token.address}
                    onSelect={() => { onSelect(token); setIsOpen(false); setSearch(""); }}
                  />
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}

function TokenRow({
  token,
  isSelected,
  onSelect,
}: {
  token: Token;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { address: userAddress } = useAccount();
  const isNative = token.address === "0x0000000000000000000000000000000000000000";

  const { data: balance } = useBalance({
    address: userAddress,
    token: isNative ? undefined : (token.address as `0x${string}`),
    chainId: token.chainId,
  });

  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl text-left transition-all
        hover:bg-white/5
        ${isSelected ? "bg-[#d0bcff]/10" : ""}`}
    >
      <TokenIcon symbol={token.symbol} size={40} />

      <div className="flex-1 min-w-0">
        <p className="font-heading font-semibold text-[var(--color-text-primary)]">
          {token.symbol}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] truncate">
          {token.name}
        </p>
      </div>

      {balance && (
        <span className="text-sm font-heading font-semibold text-[var(--color-text-primary)]">
          {parseFloat(formatUnits(balance.value, balance.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
        </span>
      )}
    </button>
  );
}

function TokenIcon({ symbol, size = 32 }: { symbol: string; size?: number }) {
  const icons: Record<string, string> = {
    ETH: "/tokens/ethereum-eth.png",
    MATIC: "/tokens/MAtic.png",
    BNB: "/tokens/Binance-Coin.png",
    USDC: "/tokens/USD_Coin_logo_(cropped).png",
  };

  const fallbackColors: Record<string, string> = {
    ETH: "#3b82f6",
    MATIC: "#8b5cf6",
    BNB: "#f59e0b",
    USDC: "#2775ca",
  };

  const iconPath = icons[symbol];

  if (iconPath) {
    return (
      <img
        src={iconPath}
        alt={symbol}
        className="rounded-full shrink-0 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: fallbackColors[symbol] || "#6b7280",
        fontSize: size * 0.35,
      }}
    >
      {symbol.charAt(0)}
    </div>
  );
}
