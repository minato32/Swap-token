"use client";

import { useState, useEffect, useRef } from "react";
import type { SwapQuote } from "@/lib/types";
import { formatAmount } from "@/lib/utils";

interface QuoteDetailsProps {
  quote: SwapQuote;
  fromSymbol: string;
  toSymbol: string;
}

export function QuoteDetails({ quote, fromSymbol, toSymbol }: QuoteDetailsProps) {
  const [feeExpanded, setFeeExpanded] = useState(false);

  return (
    <div className="space-y-2 mt-4 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
      <DetailRow label="Output Amount" value={`${formatAmount(quote.outputAmount)} ${toSymbol}`} />
      {quote.exchangeRate && (
        <DetailRow
          label="Exchange Rate"
          value={`1 ${fromSymbol} = ${formatAmount(quote.exchangeRate)} ${toSymbol}`}
        />
      )}
      <DetailRow label="Price Impact" value={quote.priceImpact} highlight={parseFloat(quote.priceImpact) > 1} />

      <div>
        <button
          onClick={() => setFeeExpanded(!feeExpanded)}
          className="flex items-center justify-between w-full text-xs group"
        >
          <span className="text-[var(--color-text-secondary)]">Total Fee</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--color-text-primary)] font-medium">
              {quote.totalFee} {toSymbol}
            </span>
            <svg
              className={`w-3 h-3 text-[var(--color-text-secondary)] transition-transform duration-200 ${feeExpanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {feeExpanded && (
          <div className="mt-1.5 ml-2 pl-2 border-l border-[var(--color-border)] space-y-1.5">
            {parseFloat(quote.protocolFee) > 0 && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--color-text-secondary)]">Protocol Fee</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--color-text-primary)]">{quote.protocolFee} {toSymbol}</span>
                  <span className="px-1 py-0.5 rounded bg-[#d0bcff]/10 text-[#d0bcff] font-label text-[9px]">
                    {quote.feeTierLabel}
                  </span>
                </div>
              </div>
            )}
            {quote.swapType === "cross-chain" && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--color-text-secondary)]">Bridge Fee</span>
                <span className="text-[var(--color-text-primary)]">{quote.bridgeFee} ETH</span>
              </div>
            )}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--color-text-secondary)]">Gas Fee</span>
              <span className="text-[var(--color-text-primary)]">{quote.estimatedGas} ETH</span>
            </div>
          </div>
        )}
      </div>

      <EstimatedTimeRow estimatedTime={quote.estimatedTime} />
    </div>
  );
}

function EstimatedTimeRow({ estimatedTime }: { estimatedTime: string }) {
  const [seconds, setSeconds] = useState(() => parseTimeToSeconds(estimatedTime));
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSeconds(parseTimeToSeconds(estimatedTime));
  }, [estimatedTime]);

  useEffect(() => {
    if (seconds <= 0) return;

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [seconds > 0]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[var(--color-text-secondary)]">Estimated Time</span>
      <div className="flex items-center gap-2">
        <span className="text-[var(--color-text-primary)] font-medium">
          {estimatedTime}
        </span>
        {seconds > 0 && (
          <span className="font-label text-[10px] px-1.5 py-0.5 rounded bg-[#d0bcff]/10 text-[#d0bcff] tabular-nums">
            {String(minutes).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
        )}
        {seconds === 0 && (
          <span className="font-label text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
            Ready
          </span>
        )}
      </div>
    </div>
  );
}

function parseTimeToSeconds(time: string): number {
  const match = time.match(/(\d+)-?(\d+)?\s*(min|sec|s|m)/i);
  if (!match) return 180;

  const maxValue = parseInt(match[2] || match[1]);
  const unit = match[3].toLowerCase();

  if (unit === "min" || unit === "m") return maxValue * 60;
  return maxValue;
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[var(--color-text-secondary)]">{label}</span>
      <span className={highlight ? "text-amber-400 font-medium" : "text-[var(--color-text-primary)] font-medium"}>
        {value}
      </span>
    </div>
  );
}
