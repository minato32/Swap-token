export interface SwapQuote {
  outputAmount: string;
  priceImpact: string;
  estimatedGas: string;
  bridgeFee: string;
  protocolFee: string;
  totalFee: string;
  feeTier: number;
  feeTierLabel: string;
  estimatedTime: string;
  exchangeRate: string;
  swapType: "same-chain" | "cross-chain";
  inputAmountUsd: string | null;
  outputAmountUsd: string | null;
  uniswapFeeTier: number;
}

export interface SwapRequest {
  fromToken: string;
  toToken: string;
  amount: string;
  fromChain: string;
  toChain: string;
  recipient: string;
  minAmountOut: string;
}

export interface SwapTransaction {
  to: string;
  data: string;
  value: string;
  chainId: number;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export type TransactionStatus =
  | "PENDING"
  | "SOURCE_CONFIRMED"
  | "BRIDGING"
  | "DELIVERED"
  | "FAILED";

export interface StatusResponse {
  status: TransactionStatus;
  confirmations: number;
  estimatedTimeRemaining: string | null;
  layerZeroScanUrl: string | null;
}

export interface Chain {
  id: number;
  name: string;
  symbol: string;
  logo: string;
}
