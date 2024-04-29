import type { Chain } from "./types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const SUPPORTED_CHAINS: Chain[] = [
  {
    id: 11155111,
    name: "Sepolia",
    symbol: "ETH",
    logo: "/chains/ethereum.svg",
  },
  {
    id: 80002,
    name: "Amoy",
    symbol: "MATIC",
    logo: "/chains/polygon.svg",
  },
  // {
  //   id: 97,
  //   name: "BSC Testnet",
  //   symbol: "BNB",
  //   logo: "/chains/bnb.svg",
  // },
];

export const PROTOCOL_FEE_BPS = 30;
export const MAX_SLIPPAGE_BPS = 100;
export const QUOTE_DEBOUNCE_MS = 500;
export const STATUS_POLL_INTERVAL_MS = 10_000;
