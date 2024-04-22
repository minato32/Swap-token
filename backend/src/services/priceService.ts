import { ethers } from "ethers";

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
  const parsedAmount = ethers.parseUnits(amount, 18);

  const protocolFee = (parsedAmount * BigInt(FEE_BPS)) / BigInt(BPS_DENOMINATOR);
  const amountAfterFee = parsedAmount - protocolFee;

  const estimatedGasGwei = BigInt(30);
  const estimatedGasUnits = BigInt(250_000);
  const gasCost = estimatedGasUnits * estimatedGasGwei * BigInt(1e9);

  const bridgeFee = ethers.parseUnits("0.001", 18);

  const exchangeRate = fetchExchangeRate(fromToken, toToken, fromChain);
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

function fetchExchangeRate(
  _fromToken: string,
  _toToken: string,
  _chain: string
): number {
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
