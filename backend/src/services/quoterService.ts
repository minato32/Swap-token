import { ethers } from "ethers";
import { getChainConfig } from "../config/chains";

const QUOTER_V2_ABI = [
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];

const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";

const providerCache: Record<string, ethers.JsonRpcProvider> = {};

function getProvider(chain: string): ethers.JsonRpcProvider | null {
  if (providerCache[chain]) return providerCache[chain];

  const config = getChainConfig(chain);
  if (!config?.rpcUrl) return null;

  providerCache[chain] = new ethers.JsonRpcProvider(config.rpcUrl);
  return providerCache[chain];
}

function resolveWeth(tokenAddress: string, wethAddress: string): string {
  if (tokenAddress.toLowerCase() === NATIVE_ADDRESS) {
    return ethers.getAddress(wethAddress.toLowerCase());
  }
  return ethers.getAddress(tokenAddress.toLowerCase());
}

export interface QuoterResult {
  amountOut: bigint;
  gasEstimate: bigint;
}

export async function quoteExactInputSingle(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  chain: string,
  feeTier: number = 3000
): Promise<QuoterResult | null> {
  const config = getChainConfig(chain);
  if (!config?.quoterV2Address || !config.wethAddress) return null;

  const provider = getProvider(chain);
  if (!provider) return null;

  const resolvedIn = resolveWeth(tokenIn, config.wethAddress);
  const resolvedOut = resolveWeth(tokenOut, config.wethAddress);

  if (resolvedIn.toLowerCase() === resolvedOut.toLowerCase()) return null;

  try {
    const quoter = new ethers.Contract(config.quoterV2Address, QUOTER_V2_ABI, provider);

    const params = {
      tokenIn: resolvedIn,
      tokenOut: resolvedOut,
      amountIn,
      fee: feeTier,
      sqrtPriceLimitX96: 0n,
    };

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("QuoterV2 timeout")), 3000)
    );

    const result = await Promise.race([
      quoter.quoteExactInputSingle.staticCall(params),
      timeoutPromise,
    ]);

    return {
      amountOut: result.amountOut,
      gasEstimate: result.gasEstimate,
    };
  } catch (error) {
    console.warn(
      `QuoterV2 failed for ${tokenIn}→${tokenOut} on ${chain}:`,
      (error as Error).message?.slice(0, 100)
    );
    return null;
  }
}
