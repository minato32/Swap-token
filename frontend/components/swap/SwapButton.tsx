"use client";

import { useState, useEffect } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { API_BASE_URL } from "@/lib/constants";
import type { Token } from "@/config/tokens";
import type { Chain } from "@/lib/types";
import { Spinner } from "@/components/ui";

type SwapStep = "idle" | "approving" | "building" | "confirming" | "submitted" | "error";

interface SwapButtonProps {
  fromToken: Token | null;
  toToken: Token | null;
  fromChain: Chain | null;
  toChain: Chain | null;
  amount: string;
  minAmountOut: string;
  disabled: boolean;
  onSuccess: (txHash: string) => void;
}

const STEP_LABELS: Record<SwapStep, string> = {
  idle: "Swap",
  approving: "Approving...",
  building: "Building Transaction...",
  confirming: "Confirm in Wallet...",
  submitted: "Transaction Submitted",
  error: "Try Again",
};

export function SwapButton({
  fromToken,
  toToken,
  fromChain,
  toChain,
  amount,
  minAmountOut,
  disabled,
  onSuccess,
}: SwapButtonProps) {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<SwapStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  useEffect(() => setMounted(true), []);

  const { sendTransactionAsync } = useSendTransaction();
  const { isLoading: isWaiting } = useWaitForTransactionReceipt({ hash: txHash });

  const isLoading = step === "approving" || step === "building" || step === "confirming" || isWaiting;

  async function handleSwap() {
    if (!fromToken || !toToken || !fromChain || !toChain || !address) return;

    try {
      setError(null);
      setStep("building");

      const chainMap: Record<number, string> = {
        11155111: "sepolia",
        80002: "amoy",
        97: "bsc",
      };

      const res = await fetch(`${API_BASE_URL}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromToken: fromToken.address,
          toToken: toToken.address,
          amount,
          fromChain: chainMap[fromChain.id],
          toChain: chainMap[toChain.id],
          recipient: address,
          minAmountOut,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to build transaction");
      }

      setStep("confirming");

      const hash = await sendTransactionAsync({
        to: data.data.to as `0x${string}`,
        data: data.data.data as `0x${string}`,
        value: BigInt(data.data.value || "0"),
        gas: BigInt(data.data.gasLimit),
      });

      setTxHash(hash);
      setStep("submitted");
      onSuccess(hash);
    } catch (err: any) {
      setStep("error");
      if (err.message?.includes("User rejected") || err.message?.includes("denied")) {
        setError("Transaction rejected by user");
      } else {
        setError(err.message || "Swap failed");
      }
    }
  }

  function getButtonText() {
    if (!mounted) return "Swap";
    if (!isConnected) return "Connect Wallet";
    if (!fromToken || !toToken) return "Select Tokens";
    if (!fromChain || !toChain) return "Select Chains";
    if (!amount || parseFloat(amount) <= 0) return "Enter Amount";
    return STEP_LABELS[step];
  }

  const isDisabled = !mounted || disabled || isLoading || !isConnected || !fromToken || !toToken || !fromChain || !toChain || !amount;

  return (
    <div className="mt-4">
      <button
        onClick={handleSwap}
        disabled={isDisabled}
        className={`w-full py-3.5 rounded-xl font-heading font-semibold text-sm transition-all
          ${isDisabled
            ? "bg-[var(--color-border)] text-[var(--color-text-secondary)] cursor-not-allowed"
            : step === "error"
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:opacity-90"
          }`}
      >
        <span className="flex items-center justify-center gap-2">
          {isLoading && <Spinner size="sm" />}
          {getButtonText()}
        </span>
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-400 text-center">{error}</p>
      )}

      {step === "submitted" && txHash && (
        <p className="mt-2 text-xs text-green-400 text-center">
          Transaction submitted! Tracking status...
        </p>
      )}
    </div>
  );
}
