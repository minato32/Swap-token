import { ethers } from "ethers";
import { getChainConfig } from "../config/chains";

const SWAP_AND_BRIDGE_ABI = [
  "function swapAndBridge(address token, address toToken, uint256 amount, uint32 destEid, address recipient, uint256 minAmountOut, bytes options) external payable",
];

const SWAP_ON_CHAIN_ABI = [
  "function swapOnChain(address tokenIn, address tokenOut, uint256 amount, uint256 minAmountOut, uint24 poolFee) external",
];

const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";

interface SwapTransaction {
  to: string;
  data: string;
  value: string;
  chainId: number;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  needsWethWrap?: boolean;
  wethAddress?: string;
  swapRouterAddress?: string;
  tokenIn?: string;
  parsedAmount?: string;
}

function buildSameChainSwapTransaction(
  fromToken: string,
  toToken: string,
  amount: string,
  chain: string,
  minAmountOut: string,
  poolFee: number = 500
): SwapTransaction {
  const chainConfig = getChainConfig(chain);
  if (!chainConfig) throw new Error("Unsupported chain");

  const contractAddress = chainConfig.swapRouterAddress || "0x0000000000000000000000000000000000000001";

  const resolvedFromToken = fromToken.toLowerCase() === NATIVE_ADDRESS && chainConfig.wethAddress
    ? ethers.getAddress(chainConfig.wethAddress.toLowerCase())
    : ethers.getAddress(fromToken.toLowerCase());
  const resolvedToToken = toToken.toLowerCase() === NATIVE_ADDRESS && chainConfig.wethAddress
    ? ethers.getAddress(chainConfig.wethAddress.toLowerCase())
    : ethers.getAddress(toToken.toLowerCase());

  const TOKEN_DECIMALS: Record<string, number> = {
    "0x0000000000000000000000000000000000000000": 18,
    "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238": 6,
    "0xb2ddc47b08971fab819e0af9ea171223b7408ed6": 18,
    "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582": 6,
    "0xfff9976782d46cc05630d1f6ebab18b2324d6b14": 18,
  };

  const fromDecimals = TOKEN_DECIMALS[fromToken.toLowerCase()] ?? 18;
  const toDecimals = TOKEN_DECIMALS[toToken.toLowerCase()] ?? 18;

  const iface = new ethers.Interface(SWAP_ON_CHAIN_ABI);
  const parsedAmount = ethers.parseUnits(amount, fromDecimals);
  const parsedMinOut = ethers.parseUnits(minAmountOut, toDecimals);
  const data = iface.encodeFunctionData("swapOnChain", [
    resolvedFromToken,
    resolvedToToken,
    parsedAmount,
    parsedMinOut,
    poolFee,
  ]);

  const needsWethWrap = fromToken.toLowerCase() === NATIVE_ADDRESS;

  return {
    to: contractAddress,
    data,
    value: "0",
    chainId: chainConfig.chainId,
    gasLimit: "200000",
    maxFeePerGas: "30000000000",
    maxPriorityFeePerGas: "2000000000",
    needsWethWrap,
    wethAddress: chainConfig.wethAddress,
    swapRouterAddress: contractAddress,
    tokenIn: resolvedFromToken,
    parsedAmount: parsedAmount.toString(),
  };
}

export async function buildSwapTransaction(
  fromToken: string,
  toToken: string,
  amount: string,
  fromChain: string,
  toChain: string,
  recipient: string,
  minAmountOut: string,
  poolFee: number = 500
): Promise<SwapTransaction> {
  if (fromChain === toChain) {
    return buildSameChainSwapTransaction(fromToken, toToken, amount, fromChain, minAmountOut, poolFee);
  }

  const sourceChain = getChainConfig(fromChain);
  const destChain = getChainConfig(toChain);

  if (!sourceChain) throw new Error("Unsupported source chain");
  if (!destChain) throw new Error("Unsupported destination chain");

  const contractAddress = sourceChain.swapRouterAddress || "0x0000000000000000000000000000000000000001";

  const swapRouter = new ethers.Interface(SWAP_AND_BRIDGE_ABI);

  const parsedAmount = ethers.parseUnits(amount, 18);
  const parsedMinOut = ethers.parseUnits(minAmountOut, 18);

  const data = swapRouter.encodeFunctionData("swapAndBridge", [
    fromToken,
    toToken,
    parsedAmount,
    destChain.lzChainId,
    recipient,
    parsedMinOut,
    "0x",
  ]);

  return {
    to: contractAddress,
    data,
    value: ethers.parseEther("0.01").toString(),
    chainId: sourceChain.chainId,
    gasLimit: "300000",
    maxFeePerGas: "30000000000",
    maxPriorityFeePerGas: "2000000000",
  };
}
