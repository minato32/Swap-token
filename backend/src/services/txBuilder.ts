import { ethers } from "ethers";
import { getChainConfig } from "../config/chains";

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

  const contractAddress = sourceChain.swapRouterAddress || "0x0000000000000000000000000000000000000001";

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

  return {
    to: contractAddress,
    data,
    value: "0",
    chainId: sourceChain.chainId,
    gasLimit: "300000",
    maxFeePerGas: "30000000000",
    maxPriorityFeePerGas: "2000000000",
  };
}
