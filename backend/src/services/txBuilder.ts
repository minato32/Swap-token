import { ethers } from "ethers";
import { getChainConfig } from "../config/chains";
import { getProvider } from "../utils/providers";

const SWAP_ROUTER_ABI = [
  "function swapAndBridge(address token, uint256 amount, uint256 destChainId, address recipient, uint256 minAmountOut) external",
];

interface SwapTransaction {
  to: string;
  data: string;
  value: string;
  chainId: number;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export async function buildSwapTransaction(
  fromToken: string,
  amount: string,
  fromChain: string,
  toChain: string,
  recipient: string,
  minAmountOut: string
): Promise<SwapTransaction> {
  const sourceChain = getChainConfig(fromChain);
  const destChain = getChainConfig(toChain);

  if (!sourceChain) throw new Error("Unsupported source chain");
  if (!destChain) throw new Error("Unsupported destination chain");
  if (!sourceChain.swapRouterAddress) {
    throw new Error("SwapRouter not available on the selected chain");
  }

  const provider = getProvider(fromChain);
  const swapRouter = new ethers.Interface(SWAP_ROUTER_ABI);

  const parsedAmount = ethers.parseUnits(amount, 18);
  const parsedMinOut = ethers.parseUnits(minAmountOut, 18);

  const data = swapRouter.encodeFunctionData("swapAndBridge", [
    fromToken,
    parsedAmount,
    destChain.chainId,
    recipient,
    parsedMinOut,
  ]);

  const feeData = await provider.getFeeData();

  const gasLimit = await provider.estimateGas({
    to: sourceChain.swapRouterAddress,
    data,
  }).catch(() => BigInt(300_000));

  return {
    to: sourceChain.swapRouterAddress,
    data,
    value: "0",
    chainId: sourceChain.chainId,
    gasLimit: gasLimit.toString(),
    maxFeePerGas: (feeData.maxFeePerGas || BigInt(0)).toString(),
    maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas || BigInt(0)).toString(),
  };
}
