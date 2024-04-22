"use client";

import { useTransactionStatus } from "@/hooks/useTransactionStatus";
import { Spinner } from "@/components/ui";
import type { TransactionStatus as TxStatus } from "@/lib/types";

interface TransactionStatusProps {
  txHash: string;
  srcChain: string;
  dstChain: string;
  onClose: () => void;
}

const STATUS_STEPS: { key: TxStatus; label: string }[] = [
  { key: "PENDING", label: "Submitted" },
  { key: "SOURCE_CONFIRMED", label: "Source Confirmed" },
  { key: "BRIDGING", label: "Bridging" },
  { key: "DELIVERED", label: "Complete" },
];

const STATUS_INDEX: Record<TxStatus, number> = {
  PENDING: 0,
  SOURCE_CONFIRMED: 1,
  BRIDGING: 2,
  DELIVERED: 3,
  FAILED: -1,
};

export function TransactionStatus({ txHash, srcChain, dstChain, onClose }: TransactionStatusProps) {
  const { result, loading } = useTransactionStatus(txHash, srcChain, dstChain);

  const currentStatus = result?.status || "PENDING";
  const isFailed = currentStatus === "FAILED";
  const isComplete = currentStatus === "DELIVERED";
  const currentIndex = STATUS_INDEX[currentStatus];

  return (
    <div className="w-full max-w-md p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">
          Transaction Status
        </h3>
        {(isComplete || isFailed) && (
          <button
            onClick={onClose}
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            New Swap
          </button>
        )}
      </div>

      {isFailed ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm font-medium text-red-400">Transaction Failed</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            The swap could not be completed. Your tokens will be refundable after 30 minutes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {STATUS_STEPS.map((step, i) => {
            const isActive = i === currentIndex;
            const isDone = i < currentIndex;

            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  {isDone ? (
                    <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : isActive ? (
                    <div className="w-7 h-7 rounded-full bg-primary-500/20 border-2 border-primary-500 flex items-center justify-center">
                      <Spinner size="sm" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[var(--color-border)] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-text-secondary)]" />
                    </div>
                  )}

                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`w-0.5 h-5 mt-1 ${isDone ? "bg-green-500" : "bg-[var(--color-border)]"}`} />
                  )}
                </div>

                <div className="flex-1 -mt-2">
                  <p className={`text-sm font-medium ${
                    isDone ? "text-green-400" : isActive ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
                  }`}>
                    {step.label}
                  </p>
                  {isActive && result?.confirmations !== undefined && result.confirmations > 0 && (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {result.confirmations} confirmations
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {result?.layerZeroScanUrl && (
        <a
          href={result.layerZeroScanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-4 text-center text-xs text-primary-400 hover:text-primary-300 transition-colors"
        >
          View on LayerZero Scan
        </a>
      )}

      <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
        <p className="text-[10px] text-[var(--color-text-secondary)] text-center truncate">
          Tx: {txHash}
        </p>
      </div>
    </div>
  );
}
