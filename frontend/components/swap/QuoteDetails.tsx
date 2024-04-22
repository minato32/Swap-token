"use client";

import type { SwapQuote } from "@/lib/types";
import { formatAmount } from "@/lib/utils";

interface QuoteDetailsProps {
  quote: SwapQuote;
  toSymbol: string;
}

export function QuoteDetails({ quote, toSymbol }: QuoteDetailsProps) {
  return (
    <div className="space-y-2 mt-4 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
      <DetailRow label="Output Amount" value={`${formatAmount(quote.outputAmount)} ${toSymbol}`} />
      <DetailRow label="Price Impact" value={quote.priceImpact} highlight={parseFloat(quote.priceImpact) > 1} />
      <DetailRow label="Protocol Fee" value={quote.totalFee} />
      <DetailRow label="Estimated Gas" value={`${quote.estimatedGas} ETH`} />
      <DetailRow label="Bridge Fee" value={`${quote.bridgeFee} ETH`} />
      <DetailRow label="Estimated Time" value={quote.estimatedTime} />
    </div>
  );
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
