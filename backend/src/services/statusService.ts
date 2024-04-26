import { getProvider } from "../utils/providers";

export type TransactionStatus =
  | "PENDING"
  | "SOURCE_CONFIRMED"
  | "BRIDGING"
  | "DELIVERED"
  | "FAILED";

interface StatusResult {
  status: TransactionStatus;
  srcTxHash: string;
  srcChain: string;
  dstChain: string;
  timestamp: number;
  confirmations: number;
  layerZeroScanUrl: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const TIMEOUT_MS = 5 * 60 * 1000;

const MAX_CACHE_SIZE = 1000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const statusCache: Record<string, StatusResult> = {};

function evictStaleEntries(): void {
  const now = Date.now();
  const keys = Object.keys(statusCache);

  for (const key of keys) {
    if (now - statusCache[key].timestamp > CACHE_TTL_MS) {
      delete statusCache[key];
    }
  }

  const remaining = Object.keys(statusCache);
  if (remaining.length > MAX_CACHE_SIZE) {
    const excess = remaining.length - MAX_CACHE_SIZE;
    for (let i = 0; i < excess; i++) {
      delete statusCache[remaining[i]];
    }
  }
}

export async function getTransactionStatus(
  txHash: string,
  srcChain: string,
  dstChain: string
): Promise<StatusResult> {
  const cached = statusCache[txHash];
  if (cached && cached.status === "DELIVERED") return cached;

  evictStaleEntries();

  const result = await pollWithRetry(txHash, srcChain, dstChain);
  statusCache[txHash] = result;

  return result;
}

async function pollWithRetry(
  txHash: string,
  srcChain: string,
  dstChain: string
): Promise<StatusResult> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await checkStatus(txHash, srcChain, dstChain);
    } catch {
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  return buildResult(txHash, srcChain, dstChain, "FAILED", 0);
}

async function checkStatus(
  txHash: string,
  srcChain: string,
  dstChain: string
): Promise<StatusResult> {
  const provider = getProvider(srcChain);
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt) {
    return buildResult(txHash, srcChain, dstChain, "PENDING", 0);
  }

  if (receipt.status === 0) {
    return buildResult(txHash, srcChain, dstChain, "FAILED", 0);
  }

  const currentBlock = await provider.getBlockNumber();
  const confirmations = currentBlock - receipt.blockNumber;

  if (confirmations < 1) {
    return buildResult(txHash, srcChain, dstChain, "PENDING", confirmations);
  }

  if (srcChain === dstChain) {
    return buildResult(txHash, srcChain, dstChain, "DELIVERED", confirmations);
  }

  if (confirmations < 12) {
    return buildResult(txHash, srcChain, dstChain, "SOURCE_CONFIRMED", confirmations);
  }

  const lzStatus = await checkLayerZeroStatus(txHash);

  if (lzStatus === "DELIVERED") {
    return buildResult(txHash, srcChain, dstChain, "DELIVERED", confirmations);
  }

  const block = await provider.getBlock(receipt.blockNumber);
  const txTimestamp = (block?.timestamp || 0) * 1000;
  const elapsed = Date.now() - txTimestamp;

  if (elapsed > TIMEOUT_MS) {
    return buildResult(txHash, srcChain, dstChain, "FAILED", confirmations);
  }

  return buildResult(txHash, srcChain, dstChain, "BRIDGING", confirmations);
}

async function checkLayerZeroStatus(txHash: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api-testnet.layerzero-scan.com/tx/${txHash}`
    );

    if (!response.ok) return "PENDING";

    const data = (await response.json()) as {
      messages?: Array<{ status: string }>;
    };

    if (data.messages && data.messages.length > 0) {
      const msg = data.messages[0];
      if (msg.status === "DELIVERED") return "DELIVERED";
      if (msg.status === "FAILED") return "FAILED";
    }

    return "BRIDGING";
  } catch {
    return "PENDING";
  }
}

function buildResult(
  txHash: string,
  srcChain: string,
  dstChain: string,
  status: TransactionStatus,
  confirmations: number
): StatusResult {
  return {
    status,
    srcTxHash: txHash,
    srcChain,
    dstChain,
    timestamp: Date.now(),
    confirmations,
    layerZeroScanUrl: `https://testnet.layerzeroscan.com/tx/${txHash}`,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
