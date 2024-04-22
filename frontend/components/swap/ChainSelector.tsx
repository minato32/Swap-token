"use client";

import { useState, useRef, useEffect } from "react";
import { SUPPORTED_CHAINS } from "@/lib/constants";
import type { Chain } from "@/lib/types";

interface ChainSelectorProps {
  selectedChain: Chain | null;
  onSelect: (chain: Chain) => void;
  excludeChainId?: number;
  label: string;
}

const CHAIN_COLORS: Record<string, string> = {
  Sepolia: "bg-blue-500",
  Amoy: "bg-purple-500",
  "BSC Testnet": "bg-yellow-500",
};

export function ChainSelector({ selectedChain, onSelect, excludeChainId, label }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const chains = SUPPORTED_CHAINS.filter((c) => c.id !== excludeChainId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        {selectedChain ? (
          <>
            <ChainIcon name={selectedChain.name} />
            <span className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">
              {selectedChain.name}
            </span>
          </>
        ) : (
          <span className="text-sm text-[var(--color-text-secondary)]">Select chain</span>
        )}
        <svg className="ml-auto w-4 h-4 text-[var(--color-text-secondary)]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl p-2">
          {chains.map((chain) => (
            <button
              key={chain.id}
              onClick={() => {
                onSelect(chain);
                setIsOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left
                hover:bg-primary-500/10 transition-colors
                ${selectedChain?.id === chain.id ? "bg-primary-500/10" : ""}`}
            >
              <ChainIcon name={chain.name} />
              <div>
                <p className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">
                  {chain.name}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">{chain.symbol}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChainIcon({ name }: { name: string }) {
  const initials: Record<string, string> = {
    Sepolia: "E",
    Amoy: "P",
    "BSC Testnet": "B",
  };

  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${CHAIN_COLORS[name] || "bg-gray-500"}`}>
      {initials[name] || "?"}
    </div>
  );
}
