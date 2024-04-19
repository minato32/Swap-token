"use client";

import { useAccount, useChainId } from "wagmi";
import { SUPPORTED_CHAINS } from "@/config/wagmi";

export function NetworkBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  if (!isConnected) return null;

  const isSupported = SUPPORTED_CHAINS.some((c) => c.id === chainId);
  if (isSupported) return null;

  return (
    <div className="w-full bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 text-center">
      <p className="text-sm font-medium text-red-500">
        Unsupported network detected. Please switch to Sepolia, Amoy, or BSC Testnet.
      </p>
    </div>
  );
}
