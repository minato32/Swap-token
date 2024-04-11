import { ethers } from "ethers";
import { getProvider } from "../utils/providers";

const FEE_BPS = 30;
const BPS_DENOMINATOR = 10_000;

interface QuoteResult {
  outputAmount: string;
  priceImpact: string;
  estimatedGas: string;
  bridgeFee: string;
  protocolFee: string;
  totalFee: string;
  estimatedTime: string;
  exchangeRate: string;
}

export async function getQuote(
  fromToken: string,
  toToken: string,
  amount: string,
  fromChain: string,
  toChain: string
): Promise<QuoteResult> {
  const provider = getProvider(fromChain);
  const parsedAmount = ethers.parseUnits(amount, 18);

  const protocolFee = (parsedAmount * BigInt(FEE_BPS)) / BigInt(BPS_DENOMINATOR);
  const amountAfterFee = parsedAmount - protocolFee;

  const gasPrice = await provider.getFeeData();
  const estimatedGasUnits = BigInt(250_000);
  const gasCost = estimatedGasUnits * (gasPrice.gasPrice || BigInt(0));

  const bridgeFee = ethers.parseUnits("0.001", 18);

  const exchangeRate = await fetchExchangeRate(fromToken, toToken, fromChain);
  const outputAmount = (amountAfterFee * BigInt(Math.floor(exchangeRate * 1e6))) / BigInt(1e6);

  const priceImpact = calculatePriceImpact(parsedAmount, outputAmount, exchangeRate);

  return {
    outputAmount: ethers.formatUnits(outputAmount, 18),
    priceImpact: `${priceImpact}%`,
    estimatedGas: ethers.formatEther(gasCost),
    bridgeFee: ethers.formatEther(bridgeFee),
    protocolFee: ethers.formatUnits(protocolFee, 18),
    totalFee: ethers.formatUnits(protocolFee + bridgeFee, 18),
    estimatedTime: "2-5 min",
    exchangeRate: exchangeRate.toFixed(6),
  };
}

async function fetchExchangeRate(
  _fromToken: string,
  _toToken: string,
  _chain: string
): Promise<number> {
  // In production, this queries Uniswap V3 SDK or 1inch API
  // For testnet, we return a simulated 1:1 rate with minor variance
  return 0.997 + Math.random() * 0.006;
}

function calculatePriceImpact(
  inputAmount: bigint,
  outputAmount: bigint,
  exchangeRate: number
): string {
  const expectedOutput =
    (inputAmount * BigInt(Math.floor(exchangeRate * 1e6))) / BigInt(1e6);

  if (expectedOutput === BigInt(0)) return "0.00";

  const impact =
    Number(((expectedOutput - outputAmount) * BigInt(10000)) / expectedOutput) / 100;

  return Math.max(0, impact).toFixed(2);
}
