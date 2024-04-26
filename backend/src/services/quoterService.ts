import { ethers } from "ethers";
import { getChainConfig } from "../config/chains";

const QUOTER_V2_ABI = [
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];

const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000";
const FEE_TIERS = [500, 3000, 10000, 100];

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
  feeTier: number;
}

export async function quoteExactInputSingle(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  chain: string
): Promise<QuoterResult | null> {
  const config = getChainConfig(chain);
  if (!config?.quoterV2Address || !config.wethAddress) return null;

  const provider = getProvider(chain);
  if (!provider) return null;

  const resolvedIn = resolveWeth(tokenIn, config.wethAddress);
  const resolvedOut = resolveWeth(tokenOut, config.wethAddress);

  if (resolvedIn.toLowerCase() === resolvedOut.toLowerCase()) return null;

  const quoterAddress = ethers.getAddress(config.quoterV2Address.toLowerCase());
  const quoter = new ethers.Contract(quoterAddress, QUOTER_V2_ABI, provider);

  console.log(`[QuoterV2] Trying ${resolvedIn}→${resolvedOut} amount=${amountIn} on ${chain}`);

  for (const fee of FEE_TIERS) {
    try {
      const params = {
        tokenIn: resolvedIn,
        tokenOut: resolvedOut,
        amountIn,
        fee,
        sqrtPriceLimitX96: BigInt(0),
      };

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("QuoterV2 timeout")), 3000)
      );

      const result = await Promise.race([
        quoter.quoteExactInputSingle.staticCall(params),
        timeoutPromise,
      ]);

      console.log(`[QuoterV2] Success: ${tokenIn}→${tokenOut} fee=${fee} amountOut=${result.amountOut}`);

      return {
        amountOut: result.amountOut,
        gasEstimate: result.gasEstimate,
        feeTier: fee,
      };
    } catch (err) {
      console.log(`[QuoterV2] fee=${fee} failed: ${(err as Error).message?.slice(0, 120)}`);
      continue;
    }
  }

  console.warn(`[QuoterV2] All fee tiers failed for ${tokenIn}→${tokenOut} on ${chain}`);
  return null;
}
