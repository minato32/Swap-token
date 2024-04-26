"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { SUPPORTED_CHAINS } from "@/lib/constants";
import type { Chain } from "@/lib/types";

interface ChainSelectorProps {
  selectedChain: Chain | null;
  onSelect: (chain: Chain) => void;
  excludeChainId?: number;
  label: string;
}

const CHAIN_ICONS: Record<string, string> = {
  Sepolia: "/chains/Sepolia eth.png",
  Amoy: "/chains/Amoy-polygon.webp",
  "BSC Testnet": "/chains/BSC-BNB.png",
};

const CHAIN_COLORS: Record<string, string> = {
  Sepolia: "#3b82f6",
  Amoy: "#8b5cf6",
  "BSC Testnet": "#f59e0b",
};

export function ChainSelector({ selectedChain, onSelect, excludeChainId, label }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const chains = SUPPORTED_CHAINS.filter((c) => c.id !== excludeChainId);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2.5 rounded-full w-full
          bg-[var(--color-surface-low)] border border-[var(--color-border)]
          hover:border-[#d0bcff]/30 transition-colors text-left"
      >
        {selectedChain ? (
          <>
            <img
              src={CHAIN_ICONS[selectedChain.name]}
              alt={selectedChain.name}
              className="w-6 h-6 rounded-full shrink-0 object-cover"
            />
            <span className="font-heading font-semibold text-sm text-[var(--color-text-primary)] truncate">
              {selectedChain.name}
            </span>
          </>
        ) : (
          <span className="text-sm text-[var(--color-text-secondary)]">Select chain</span>
        )}
        <svg className="ml-auto w-4 h-4 text-[var(--color-text-secondary)] shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Modal Overlay via Portal */}
      {isOpen && typeof window !== "undefined" ? createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 200 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

          <div className="relative w-full max-w-[400px] bg-[var(--color-surface-low)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-4">
              <h3 className="font-heading font-bold text-lg text-[var(--color-text-primary)]">Select a chain</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center hover:bg-[var(--color-border)] transition-colors"
              >
                <svg className="w-4 h-4 text-[var(--color-text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Chain List */}
            <div className="px-3 pb-4 space-y-1">
              {chains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => { onSelect(chain); setIsOpen(false); }}
                  className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl text-left transition-all
                    hover:bg-white/5
                    ${selectedChain?.id === chain.id ? "bg-[#d0bcff]/10 border border-[#d0bcff]/20" : "border border-transparent"}`}
                >
                  <img
                    src={CHAIN_ICONS[chain.name]}
                    alt={chain.name}
                    className="w-10 h-10 rounded-full shrink-0 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-[var(--color-text-primary)]">{chain.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Chain ID: {chain.id}</p>
                  </div>
                  {selectedChain?.id === chain.id && (
                    <svg className="w-5 h-5 text-[#d0bcff] shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
