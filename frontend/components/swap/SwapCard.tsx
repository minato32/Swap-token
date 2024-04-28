"use client";

import { useState, useCallback, useEffect } from "react";
import { ChainSelector } from "./ChainSelector";
import { QuoteDetails } from "./QuoteDetails";
import { RouteBreakdown } from "./RouteBreakdown";
import { SwapButton } from "./SwapButton";
import { TokenSelector } from "@/components/token/TokenSelector";
import { Skeleton } from "@/components/ui";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import { SUPPORTED_CHAINS } from "@/lib/constants";
import { SUPPORTED_TOKENS } from "@/config/tokens";
import type { Chain } from "@/lib/types";
import type { Token } from "@/config/tokens";

interface SwapCardProps {
  onSwapSuccess: (txHash: string, srcChain: string, dstChain: string) => void;
  initialFromToken?: { chainId: number; symbol: string } | null;
}

const CHAIN_NAME_MAP: Record<number, string> = {
  11155111: "sepolia",
  80002: "amoy",
  97: "bsc",
};

export function SwapCard({ onSwapSuccess, initialFromToken }: SwapCardProps) {
  const [fromChain, setFromChain] = useState<Chain | null>(null);
  const [toChain, setToChain] = useState<Chain | null>(null);
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!initialFromToken) return;
    const chain = SUPPORTED_CHAINS.find((c) => c.id === initialFromToken.chainId);
    const tokens = SUPPORTED_TOKENS[initialFromToken.chainId] || [];
    const token = tokens.find((t) => t.symbol === initialFromToken.symbol);
    if (chain) setFromChain(chain);
    if (token) setFromToken(token);
  }, [initialFromToken]);

  const fromChainKey = fromChain ? CHAIN_NAME_MAP[fromChain.id] : "";
  const toChainKey = toChain ? CHAIN_NAME_MAP[toChain.id] : "";

  const { quote, loading: quoteLoading, error: quoteError } = useSwapQuote({
    fromToken: fromToken?.address || "",
    toToken: toToken?.address || "",
    amount,
    fromChain: fromChainKey,
    toChain: toChainKey,
  });

  const handleSwapChains = useCallback(() => {
    const tempChain = fromChain;
    const tempToken = fromToken;
    setFromChain(toChain);
    setFromToken(toToken);
    setToChain(tempChain);
    setToToken(tempToken);
  }, [fromChain, toChain, fromToken, toToken]);

  const handleFromChainChange = useCallback((chain: Chain) => {
    setFromChain(chain);
    setFromToken(null);
  }, []);

  const handleToChainChange = useCallback((chain: Chain) => {
    setToChain(chain);
    setToToken(null);
  }, []);

  const handleFromTokenChange = useCallback((token: Token) => {
    setFromToken(token);
    if (fromChain?.id === toChain?.id && toToken?.address === token.address) {
      setToToken(null);
    }
  }, [fromChain, toChain, toToken]);

  const handleSuccess = useCallback((txHash: string) => {
    onSwapSuccess(txHash, fromChainKey, toChainKey);
  }, [onSwapSuccess, fromChainKey, toChainKey]);

  return (
    <div className="w-full p-2 overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2 mb-2">
        <span className="px-4 py-1.5 text-sm font-heading font-semibold text-[var(--color-text-primary)] bg-[var(--color-surface)] rounded-full border border-[var(--color-border)]">
          Swap
        </span>
        <div className="flex items-center gap-2">
          {quote && !quoteLoading && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-label ${
              quote.swapType === "same-chain"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-[#d0bcff]/10 text-[#d0bcff]"
            }`}>
              {quote.swapType === "same-chain" ? "On-chain Swap" : "Cross-chain Bridge"}
            </span>
          )}
          {fromChain && toChain && (
            <span className="text-[10px] font-label text-[var(--color-text-secondary)] uppercase tracking-wider">
              {fromChain.name}{fromChain.id !== toChain.id ? ` → ${toChain.name}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Swap Layout — stacks on mobile, horizontal on desktop */}
      <div className="flex flex-col md:flex-row items-stretch gap-2">
        {/* You Pay */}
        <div className="flex-1 bg-[var(--color-surface)] rounded-2xl p-3 md:p-4 min-w-0">
          <span className="text-xs font-medium text-[var(--color-text-secondary)] mb-3 block">You pay</span>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <ChainSelector
              selectedChain={fromChain}
              onSelect={handleFromChainChange}
              label=""
            />
            <TokenSelector
              chainId={fromChain?.id || 0}
              selectedToken={fromToken}
              onSelect={handleFromTokenChange}
              label=""
            />
          </div>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || /^\d*\.?\d*$/.test(val)) setAmount(val);
            }}
            className="w-full bg-transparent text-2xl md:text-3xl font-heading font-bold text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-secondary)]/20 focus:outline-none"
          />
          <span className="text-[11px] text-[var(--color-text-secondary)] mt-1 block">
            {quote?.inputAmountUsd ? `$${quote.inputAmountUsd}` : amount ? `$${parseFloat(amount).toFixed(2)}` : "$0.00"}
          </span>
        </div>

        {/* Swap Direction Button */}
        <div className="flex md:items-center justify-center -my-2 md:-my-0 md:-mx-3 relative" style={{ zIndex: 10 }}>
          <button
            onClick={handleSwapChains}
            aria-label="Switch chains"
            className="w-10 h-10 md:w-9 md:h-9 bg-[var(--color-surface-low)] border-4 border-[var(--color-surface-low)] rounded-xl
              flex items-center justify-center hover:bg-[var(--color-surface)] transition-all duration-200 group"
          >
            <svg
              className="w-4 h-4 text-[var(--color-text-secondary)] group-hover:text-[#d0bcff] transition-all duration-200
                rotate-90 md:rotate-0 group-hover:translate-y-0.5 md:group-hover:translate-y-0 md:group-hover:translate-x-0.5"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

        {/* You Receive */}
        <div className="flex-1 bg-[var(--color-surface)] rounded-2xl p-3 md:p-4 min-w-0">
          <span className="text-xs font-medium text-[var(--color-text-secondary)] mb-3 block">You receive</span>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <ChainSelector
              selectedChain={toChain}
              onSelect={handleToChainChange}
              label=""
            />
            <TokenSelector
              chainId={toChain?.id || 0}
              selectedToken={toToken}
              onSelect={setToToken}
              excludeAddress={fromChain?.id === toChain?.id ? fromToken?.address : undefined}
              label=""
            />
          </div>
          <div className={`text-2xl md:text-3xl font-heading font-bold truncate ${
            quote && !quoteLoading ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]/20"
          }`}>
            {quoteLoading ? (
              <div className="h-8 md:h-9 flex items-center">
                <div className="w-24 h-5 rounded-lg bg-[var(--color-border)] animate-pulse" />
              </div>
            ) : (
              quote ? parseFloat(quote.outputAmount).toString() : "0"
            )}
          </div>
          {quote && !quoteLoading && (
            <span className="text-[11px] text-[var(--color-text-secondary)] mt-1 block">
              ≈ {quote.outputAmountUsd ? `$${quote.outputAmountUsd}` : `$${parseFloat(quote.outputAmount).toFixed(2)}`}
            </span>
          )}
          {!quote && !quoteLoading && (
            <span className="text-[11px] text-[var(--color-text-secondary)] mt-1 block">$0.00</span>
          )}
        </div>
      </div>

      {/* Quote Error */}
      {quoteError && (
        <p className="mt-3 text-xs text-amber-400 text-center">{quoteError}</p>
      )}

      {/* Quote Details + Route */}
      {quote && !quoteLoading && (
        <div className="mt-3">
          <QuoteDetails quote={quote} fromSymbol={fromToken?.symbol || ""} toSymbol={toToken?.symbol || ""} />
          {fromToken && toToken && fromChain && toChain && (
            <RouteBreakdown
              fromSymbol={fromToken.symbol}
              toSymbol={toToken.symbol}
              fromChain={fromChain.name}
              toChain={toChain.name}
              fee={quote.totalFee}
              swapType={quote.swapType}
            />
          )}
        </div>
      )}

      {/* Swap Button */}
      <div className="mt-3">
        <SwapButton
          fromToken={fromToken}
          toToken={toToken}
          fromChain={fromChain}
          toChain={toChain}
          amount={amount}
          minAmountOut={quote?.outputAmount || "0"}
          poolFee={quote?.uniswapFeeTier || 500}
          disabled={!quote || quoteLoading || !!quoteError}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
