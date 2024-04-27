"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseUnits, parseGwei, maxUint256, erc20Abi, getAddress } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { wagmiConfig } from "@/config/wagmi";
import { API_BASE_URL } from "@/lib/constants";
import type { Token } from "@/config/tokens";
import type { Chain } from "@/lib/types";
import { Spinner } from "@/components/ui";

const WETH_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
] as const;

const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";

type SwapStep = "idle" | "wrapping" | "approving" | "building" | "confirming" | "submitted" | "error";

interface SwapButtonProps {
  fromToken: Token | null;
  toToken: Token | null;
  fromChain: Chain | null;
  toChain: Chain | null;
  amount: string;
  minAmountOut: string;
  poolFee: number;
  disabled: boolean;
  onSuccess: (txHash: string) => void;
}

const STEP_LABELS: Record<SwapStep, string> = {
  idle: "Swap",
  wrapping: "Wrapping ETH → WETH...",
  approving: "Approving Token...",
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
  poolFee,
  disabled,
  onSuccess,
}: SwapButtonProps) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<SwapStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [swapRouterAddress, setSwapRouterAddress] = useState<`0x${string}` | undefined>();
  const [tokenInAddress, setTokenInAddress] = useState<`0x${string}` | undefined>();

  useEffect(() => setMounted(true), []);

  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const { isLoading: isWaiting } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: _allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenInAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && swapRouterAddress ? [address, swapRouterAddress] : undefined,
    query: {
      enabled: !!tokenInAddress && !!address && !!swapRouterAddress,
    },
  });

  const isLoading = step === "wrapping" || step === "approving" || step === "building" || step === "confirming" || isWaiting;

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
          poolFee,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to build transaction");
      }

      const txData = data.data;
      const routerAddr = getAddress(txData.swapRouterAddress) as `0x${string}`;
      const resolvedTokenIn = getAddress(txData.tokenIn) as `0x${string}`;
      const parsedAmount = BigInt(txData.parsedAmount || parseUnits(amount, 18).toString());

      setSwapRouterAddress(routerAddr);
      setTokenInAddress(resolvedTokenIn);

      let needsApproval = false;

      if (txData.needsWethWrap) {
        setStep("wrapping");
        const wethAddr = getAddress(txData.wethAddress) as `0x${string}`;

        const wrapHash = await writeContractAsync({
          address: wethAddr,
          abi: WETH_ABI,
          functionName: "deposit",
          value: parsedAmount,
          maxFeePerGas: parseGwei("50"),
          maxPriorityFeePerGas: parseGwei("30"),
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: wrapHash });

        needsApproval = true;
      } else {
        const { data: currentAllowance } = await refetchAllowance();
        needsApproval = (currentAllowance ?? BigInt(0)) < parsedAmount;
      }

      if (needsApproval) {
        setStep("approving");
        const approveHash = await writeContractAsync({
          address: resolvedTokenIn,
          abi: erc20Abi,
          functionName: "approve",
          args: [routerAddr, maxUint256],
          maxFeePerGas: parseGwei("50"),
          maxPriorityFeePerGas: parseGwei("30"),
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
      }

      setStep("confirming");

      const hash = await sendTransactionAsync({
        to: txData.to as `0x${string}`,
        data: txData.data as `0x${string}`,
        value: BigInt(txData.value || "0"),
        gas: BigInt(txData.gasLimit),
        maxFeePerGas: parseGwei("50"),
        maxPriorityFeePerGas: parseGwei("30"),
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

  const isDisabled = !mounted || isLoading || (isConnected && (disabled || !fromToken || !toToken || !fromChain || !toChain || !amount));

  return (
    <div className="mt-4">
      <button
        onClick={!isConnected ? openConnectModal : handleSwap}
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
