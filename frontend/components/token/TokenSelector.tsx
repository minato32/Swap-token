"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useBalance, useAccount } from "wagmi";
import { formatUnits } from "viem";
import { type Token, SUPPORTED_TOKENS } from "@/config/tokens";

interface TokenSelectorProps {
  chainId: number;
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  label: string;
}

export function TokenSelector({ chainId, selectedToken, onSelect, label }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tokens = useMemo(() => {
    const chainTokens = SUPPORTED_TOKENS[chainId] || [];
    if (!search) return chainTokens;

    const query = search.toLowerCase();
    return chainTokens.filter(
      (t) => t.symbol.toLowerCase().includes(query) || t.name.toLowerCase().includes(query)
    );
  }, [chainId, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setSearch("");
  }, [chainId]);

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
        {label}
      </label>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl w-full
          bg-[var(--color-surface)] border border-[var(--color-border)]
          hover:border-primary-400 transition-colors text-left"
      >
        {selectedToken ? (
          <>
            <TokenIcon symbol={selectedToken.symbol} />
            <span className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">
              {selectedToken.symbol}
            </span>
          </>
        ) : (
          <span className="text-sm text-[var(--color-text-secondary)]">Select token</span>
        )}
        <ChevronIcon className="ml-auto w-4 h-4 text-[var(--color-text-secondary)]" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full min-w-[240px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
          <div className="p-3 border-b border-[var(--color-border)]">
            <input
              type="text"
              placeholder="Search tokens..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg)] border border-[var(--color-border)]
                text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]
                focus:outline-none focus:border-primary-400"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto p-2">
            {tokens.length === 0 ? (
              <p className="text-center text-sm text-[var(--color-text-secondary)] py-4">
                No tokens found
              </p>
            ) : (
              tokens.map((token) => (
                <TokenRow
                  key={token.address}
                  token={token}
                  isSelected={selectedToken?.address === token.address}
                  onSelect={() => {
                    onSelect(token);
                    setIsOpen(false);
                    setSearch("");
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
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
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left
        hover:bg-primary-500/10 transition-colors
        ${isSelected ? "bg-primary-500/10 border border-primary-500/30" : ""}`}
    >
      <TokenIcon symbol={token.symbol} />

      <div className="flex-1 min-w-0">
        <p className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">
          {token.symbol}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] truncate">
          {token.name}
        </p>
      </div>

      {balance && (
        <span className="text-xs text-[var(--color-text-secondary)]">
          {parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)}
        </span>
      )}
    </button>
  );
}

function TokenIcon({ symbol }: { symbol: string }) {
  const colors: Record<string, string> = {
    ETH: "bg-blue-500",
    MATIC: "bg-purple-500",
    BNB: "bg-yellow-500",
    USDC: "bg-blue-400",
  };

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${colors[symbol] || "bg-gray-500"}`}>
      {symbol.charAt(0)}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}
