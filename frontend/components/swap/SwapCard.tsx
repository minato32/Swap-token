"use client";

import { useState, useCallback } from "react";
import { ChainSelector } from "./ChainSelector";
import { QuoteDetails } from "./QuoteDetails";
import { RouteBreakdown } from "./RouteBreakdown";
import { SwapButton } from "./SwapButton";
import { TokenSelector } from "@/components/token/TokenSelector";
import { Skeleton } from "@/components/ui";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import type { Chain } from "@/lib/types";
import type { Token } from "@/config/tokens";

interface SwapCardProps {
  onSwapSuccess: (txHash: string, srcChain: string, dstChain: string) => void;
}

const CHAIN_NAME_MAP: Record<number, string> = {
  11155111: "sepolia",
  80002: "amoy",
  97: "bsc",
};

export function SwapCard({ onSwapSuccess }: SwapCardProps) {
  const [fromChain, setFromChain] = useState<Chain | null>(null);
  const [toChain, setToChain] = useState<Chain | null>(null);
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState("");

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
    setFromChain(toChain);
    setToChain(fromChain);
    setFromToken(null);
    setToToken(null);
  }, [fromChain, toChain]);

  const handleFromChainChange = useCallback((chain: Chain) => {
    setFromChain(chain);
    setFromToken(null);
  }, []);

  const handleToChainChange = useCallback((chain: Chain) => {
    setToChain(chain);
    setToToken(null);
  }, []);

  const handleSuccess = useCallback((txHash: string) => {
    onSwapSuccess(txHash, fromChainKey, toChainKey);
  }, [onSwapSuccess, fromChainKey, toChainKey]);

  return (
    <div className="w-full max-w-md p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <h2 className="font-heading font-semibold text-lg text-[var(--color-text-primary)] mb-4">
        Swap
      </h2>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <ChainSelector
            selectedChain={fromChain}
            onSelect={handleFromChainChange}
            excludeChainId={toChain?.id}
            label="From Chain"
          />
          <TokenSelector
            chainId={fromChain?.id || 0}
            selectedToken={fromToken}
            onSelect={setFromToken}
            label="From Token"
          />
        </div>

        <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Amount
          </label>
          <input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent text-2xl font-heading font-bold text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-secondary)]/30 focus:outline-none
              [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        <div className="flex justify-center -my-1">
          <button
            onClick={handleSwapChains}
            className="w-9 h-9 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]
              flex items-center justify-center hover:border-primary-400 transition-colors z-10"
          >
            <svg className="w-4 h-4 text-[var(--color-text-secondary)]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.24 6.8a.75.75 0 001.06-.04l1.95-2.1v8.59a.75.75 0 001.5 0V4.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0L2.2 5.74a.75.75 0 00.04 1.06zm8 6.4a.75.75 0 00-.04 1.06l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75a.75.75 0 00-1.5 0v8.59l-1.95-2.1a.75.75 0 00-1.06-.04z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ChainSelector
            selectedChain={toChain}
            onSelect={handleToChainChange}
            excludeChainId={fromChain?.id}
            label="To Chain"
          />
          <TokenSelector
            chainId={toChain?.id || 0}
            selectedToken={toToken}
            onSelect={setToToken}
            label="To Token"
          />
        </div>

        {quoteLoading && (
          <div className="space-y-2 mt-4 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {quoteError && (
          <p className="mt-3 text-xs text-amber-400 text-center">{quoteError}</p>
        )}

        {quote && !quoteLoading && (
          <>
            <QuoteDetails quote={quote} toSymbol={toToken?.symbol || ""} />
            {fromToken && toToken && fromChain && toChain && (
              <RouteBreakdown
                fromSymbol={fromToken.symbol}
                toSymbol={toToken.symbol}
                fromChain={fromChain.name}
                toChain={toChain.name}
                fee={quote.totalFee}
              />
            )}
          </>
        )}

        <SwapButton
          fromToken={fromToken}
          toToken={toToken}
          fromChain={fromChain}
          toChain={toChain}
          amount={amount}
          minAmountOut={quote?.outputAmount || "0"}
          disabled={!quote || quoteLoading || !!quoteError}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
