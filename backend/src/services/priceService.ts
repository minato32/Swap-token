import { ethers } from "ethers";
import { getChainConfig } from "../config/chains";
import { quoteExactInputSingle } from "./quoterService";
import {
  resolveSymbol,
  getUsdPrice as getCoinGeckoUsdPrice,
  getExchangeRateFromUsd as getCoinGeckoExchangeRate,
} from "./coinGeckoService";
import {
  getLatestPrice as getBinancePrice,
  getExchangeRate as getBinanceExchangeRate,
  isConnected as isBinanceConnected,
} from "./binanceWsService";

const BPS_DENOMINATOR = 10_000;
const DEFAULT_FEE_BPS = 15;

async function getLiveExchangeRate(
  fromSymbol: string,
  toSymbol: string
): Promise<{ value: number; source: string }> {
  const binanceRate = getBinanceExchangeRate(fromSymbol, toSymbol);
  if (binanceRate && isBinanceConnected()) {
    return { value: binanceRate, source: "binance" };
  }

  const cgRate = await getCoinGeckoExchangeRate(fromSymbol, toSymbol);
  if (cgRate) {
    return { value: cgRate, source: "coingecko" };
  }

  return { value: 0.997, source: "fallback" };
}

async function getLiveUsdPrice(symbol: string): Promise<number | null> {
  const binancePrice = getBinancePrice(symbol);
  if (binancePrice && isBinanceConnected()) return binancePrice;
  return getCoinGeckoUsdPrice(symbol);
}

const FEE_TIER_LABELS: Record<number, string> = {
  0: "0%",
  1: "0.01%",
  5: "0.05%",
  15: "0.15%",
  30: "0.30%",
  100: "1.00%",
};

const PAIR_FEE_OVERRIDES: Record<string, number> = {};

const TOKEN_DECIMALS: Record<string, number> = {
  "0x0000000000000000000000000000000000000000": 18,
  "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238": 6,
  "0xb2ddc47b08971fab819e0af9ea171223b7408ed6": 18,
  "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582": 6,
  "0x64544969ed7ebf5f083679233325356ebe738930": 18,
  "0xfff9976782d46cc05630d1f6ebab18b2324d6b14": 18,
};

interface QuoteResult {
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

function getTokenDecimals(tokenAddress: string): number {
  return TOKEN_DECIMALS[tokenAddress.toLowerCase()] ?? 18;
}

function getPairKey(tokenA: string, tokenB: string): string {
  const [t0, t1] =
    tokenA.toLowerCase() < tokenB.toLowerCase()
      ? [tokenA.toLowerCase(), tokenB.toLowerCase()]
      : [tokenB.toLowerCase(), tokenA.toLowerCase()];
  return `${t0}-${t1}`;
}

function getFeeBps(fromToken: string, toToken: string): number {
  const key = getPairKey(fromToken, toToken);
  return PAIR_FEE_OVERRIDES[key] ?? DEFAULT_FEE_BPS;
}

export async function getQuote(
  fromToken: string,
  toToken: string,
  amount: string,
  fromChain: string,
  toChain: string
): Promise<QuoteResult> {
  const isSameChain = fromChain === toChain;
  const fromDecimals = getTokenDecimals(fromToken);
  const toDecimals = getTokenDecimals(toToken);

  const parsedAmount = ethers.parseUnits(amount, fromDecimals);

  const feeBps = isSameChain ? 0 : getFeeBps(fromToken, toToken);
  const protocolFee = (parsedAmount * BigInt(feeBps)) / BigInt(BPS_DENOMINATOR);
  const amountAfterFee = parsedAmount - protocolFee;

  const estimatedGasGwei = BigInt(30);
  const estimatedGasUnits = isSameChain ? BigInt(180_000) : BigInt(250_000);
  const gasCost = estimatedGasUnits * estimatedGasGwei * BigInt(1e9);

  const bridgeFee = isSameChain ? BigInt(0) : ethers.parseUnits("0.001", 18);

  const fromChainConfig = getChainConfig(fromChain);
  const toChainConfig = getChainConfig(toChain);
  const fromNativeSymbol = fromChainConfig?.nativeSymbol || "ETH";
  const toNativeSymbol = toChainConfig?.nativeSymbol || "ETH";
  const fromSymbol = resolveSymbol(fromToken, fromNativeSymbol);
  const toSymbol = resolveSymbol(toToken, toNativeSymbol);

  let outputAmount: bigint;
  let exchangeRate: number;
  let priceSource: string;
  let uniswapFeeTier = 0;

  if (isSameChain) {
    const quoterResult = await quoteExactInputSingle(
      fromToken,
      toToken,
      amountAfterFee,
      fromChain
    );

    if (quoterResult) {
      outputAmount = quoterResult.amountOut;
      uniswapFeeTier = quoterResult.feeTier;
      const fromFloat = parseFloat(ethers.formatUnits(amountAfterFee, fromDecimals));
      const toFloat = parseFloat(ethers.formatUnits(outputAmount, toDecimals));
      exchangeRate = fromFloat > 0 ? toFloat / fromFloat : 0;
      priceSource = "quoter";
    } else {
      const rate = await getLiveExchangeRate(fromSymbol, toSymbol);
      exchangeRate = rate.value;
      outputAmount = convertWithRate(amountAfterFee, exchangeRate, fromDecimals, toDecimals);
      priceSource = rate.source;
    }
  } else {
    const rate = await getLiveExchangeRate(fromSymbol, toSymbol);
    exchangeRate = rate.value;
    outputAmount = convertWithRate(amountAfterFee, exchangeRate, fromDecimals, toDecimals);
    priceSource = rate.source;
  }

  const priceImpact = calculatePriceImpact(
    amountAfterFee,
    outputAmount,
    exchangeRate,
    fromDecimals,
    toDecimals
  );

  const fromUsd = await getLiveUsdPrice(fromSymbol);
  const toUsd = await getLiveUsdPrice(toSymbol);
  const inputAmountUsd = fromUsd ? (parseFloat(amount) * fromUsd).toFixed(2) : null;
  const outputAmountUsd = toUsd
    ? (parseFloat(ethers.formatUnits(outputAmount, toDecimals)) * toUsd).toFixed(2)
    : null;

  console.log(`[Quote] ${amount} ${fromSymbol}→${toSymbol} | source: ${priceSource} | rate: ${exchangeRate.toFixed(6)} | output: ${ethers.formatUnits(outputAmount, toDecimals)}`);

  return {
    outputAmount: ethers.formatUnits(outputAmount, toDecimals),
    priceImpact: `${priceImpact}%`,
    estimatedGas: ethers.formatEther(gasCost),
    bridgeFee: ethers.formatEther(bridgeFee),
    protocolFee: ethers.formatUnits(protocolFee, fromDecimals),
    totalFee: isSameChain
      ? ethers.formatUnits(protocolFee, fromDecimals)
      : ethers.formatUnits(protocolFee, fromDecimals),
    feeTier: feeBps,
    feeTierLabel: FEE_TIER_LABELS[feeBps] || `${(feeBps / 100).toFixed(2)}%`,
    estimatedTime: isSameChain ? "~30 sec" : "2-5 min",
    exchangeRate: exchangeRate.toFixed(6),
    swapType: isSameChain ? "same-chain" : "cross-chain",
    inputAmountUsd,
    outputAmountUsd,
    uniswapFeeTier,
  };
}

function convertWithRate(
  amount: bigint,
  rate: number,
  fromDecimals: number,
  toDecimals: number
): bigint {
  const rateScaled = BigInt(Math.floor(rate * 1e12));
  const raw = (amount * rateScaled) / BigInt(1e12);

  if (fromDecimals === toDecimals) return raw;

  if (fromDecimals > toDecimals) {
    return raw / BigInt(10 ** (fromDecimals - toDecimals));
  }
  return raw * BigInt(10 ** (toDecimals - fromDecimals));
}

function calculatePriceImpact(
  inputAmount: bigint,
  outputAmount: bigint,
  exchangeRate: number,
  fromDecimals: number,
  toDecimals: number
): string {
  if (inputAmount === 0n || exchangeRate === 0) return "0.00";

  const expectedOutput = convertWithRate(inputAmount, exchangeRate, fromDecimals, toDecimals);
  if (expectedOutput === 0n) return "0.00";

  const impact =
    Number(((expectedOutput - outputAmount) * BigInt(10000)) / expectedOutput) / 100;

  return Math.max(0, impact).toFixed(2);
}
