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
import { parseUnits, maxUint256, erc20Abi, getAddress, formatEther } from "viem";
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

type SwapStep = "idle" | "pending-confirm" | "wrapping" | "approving" | "building" | "confirming" | "submitted" | "error";

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

interface PendingWrapData {
  txData: any;
  routerAddr: `0x${string}`;
  resolvedTokenIn: `0x${string}`;
  parsedAmount: bigint;
  displayAmount: string;
}

const STEP_LABELS: Record<SwapStep, string> = {
  idle: "Swap",
  "pending-confirm": "Confirm Amount",
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
  const [pendingWrap, setPendingWrap] = useState<PendingWrapData | null>(null);

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
  const isPendingConfirm = step === "pending-confirm" && pendingWrap !== null;

  async function handleSwap() {
    if (!fromToken || !toToken || !fromChain || !toChain || !address) return;

    try {
      setError(null);
      setStep("building");

      const chainMap: Record<number, string> = {
        11155111: "sepolia",
        80002: "amoy",
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

      if (!txData.swapRouterAddress || !txData.tokenIn) {
        throw new Error("Missing contract addresses. Restart the backend to reload configuration.");
      }

      const routerAddr = getAddress(txData.swapRouterAddress) as `0x${string}`;
      const resolvedTokenIn = getAddress(txData.tokenIn) as `0x${string}`;
      const parsedAmount = BigInt(txData.parsedAmount || parseUnits(amount, 18).toString());

      setSwapRouterAddress(routerAddr);
      setTokenInAddress(resolvedTokenIn);

      if (txData.needsWethWrap) {
        setPendingWrap({
          txData,
          routerAddr,
          resolvedTokenIn,
          parsedAmount,
          displayAmount: formatEther(parsedAmount),
        });
        setStep("pending-confirm");
        return;
      }

      await executeSwap(txData, routerAddr, resolvedTokenIn, parsedAmount, false);
    } catch (err: any) {
      handleSwapError(err);
    }
  }

  async function handleConfirmWrap() {
    if (!pendingWrap || !fromChain || !toChain) return;
    const { txData, routerAddr, resolvedTokenIn, parsedAmount } = pendingWrap;
    setPendingWrap(null);

    try {
      await executeSwap(txData, routerAddr, resolvedTokenIn, parsedAmount, true);
    } catch (err: any) {
      handleSwapError(err);
    }
  }

  function handleCancelWrap() {
    setPendingWrap(null);
    setStep("idle");
    setError(null);
  }

  async function executeSwap(
    txData: any,
    routerAddr: `0x${string}`,
    resolvedTokenIn: `0x${string}`,
    parsedAmount: bigint,
    needsWrap: boolean,
  ) {
    let needsApproval = false;

    if (needsWrap) {
      setStep("wrapping");
      const wethAddr = getAddress(txData.wethAddress) as `0x${string}`;

      const wrapHash = await writeContractAsync({
        address: wethAddr,
        abi: WETH_ABI,
        functionName: "deposit",
        value: parsedAmount,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: wrapHash, timeout: 120_000 });

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
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: approveHash, timeout: 120_000 });
    }

    setStep("confirming");

    const isCrossChain = fromChain?.id !== toChain?.id;
    let hash: `0x${string}`;

    if (isCrossChain) {
      const SWAP_AND_BRIDGE_ABI = [{
        name: "swapAndBridge",
        type: "function",
        stateMutability: "payable",
        inputs: [
          { name: "token", type: "address" },
          { name: "toToken", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "destEid", type: "uint32" },
          { name: "recipient", type: "address" },
          { name: "minAmountOut", type: "uint256" },
          { name: "options", type: "bytes" },
        ],
        outputs: [],
      }] as const;

      const args = txData.decodedArgs;
      hash = await writeContractAsync({
        address: txData.to as `0x${string}`,
        abi: SWAP_AND_BRIDGE_ABI,
        functionName: "swapAndBridge",
        args: [
          args[0] as `0x${string}`,       // token
          args[1] as `0x${string}`,       // toToken
          BigInt(args[2]),                 // amount
          Number(args[3]),                 // destEid
          args[4] as `0x${string}`,       // recipient
          BigInt(args[5]),                 // minAmountOut
          args[6] as `0x${string}`,       // options
        ],
        value: BigInt(txData.value || "0"),
        gas: BigInt(txData.gasLimit),
      });
    } else {
      hash = await sendTransactionAsync({
        to: txData.to as `0x${string}`,
        data: txData.data as `0x${string}`,
        value: BigInt(txData.value || "0"),
        gas: BigInt(txData.gasLimit),
      });
    }

    setTxHash(hash);
    setStep("submitted");
    onSuccess(hash);
  }

  function handleSwapError(err: any) {
    setStep("error");
    if (err.message?.includes("User rejected") || err.message?.includes("denied")) {
      setError("Transaction rejected by user");
    } else if (err.message?.includes("insufficient funds") || err.message?.includes("Insufficient")) {
      setError("Insufficient balance for this transaction");
    } else if (err.message?.includes("LayerZero") || err.message?.includes("bridge fee")) {
      setError("Unable to estimate bridge fee. Please try again.");
    } else if (err.message?.includes("Price data unavailable")) {
      setError("Price data unavailable. Please try again later.");
    } else if (err.message?.includes("Same-chain swaps")) {
      setError("Same-chain swaps not available on this network.");
    } else {
      setError("Swap failed. Please try again.");
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

  const isDisabled = !mounted || isLoading || isPendingConfirm || (isConnected && (disabled || !fromToken || !toToken || !fromChain || !toChain || !amount));

  return (
    <div className="mt-4">
      {isPendingConfirm && pendingWrap ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
          <p className="text-sm font-heading font-semibold text-amber-400 text-center">
            Confirm Wrap Amount
          </p>
          <p className="text-center text-[var(--color-text-primary)] text-lg font-bold font-heading">
            {pendingWrap.displayAmount} ETH
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] text-center">
            This amount will be wrapped from ETH to WETH before swapping. Please verify it matches what you entered.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancelWrap}
              className="flex-1 py-2.5 rounded-xl font-heading font-semibold text-sm
                bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmWrap}
              className="flex-1 py-2.5 rounded-xl font-heading font-semibold text-sm
                bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:opacity-90 transition-all"
            >
              Confirm & Wrap
            </button>
          </div>
        </div>
      ) : (
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
      )}

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
