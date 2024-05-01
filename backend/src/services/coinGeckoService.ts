const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";
const CACHE_TTL_MS = 300_000; // 5 minutes — avoids CoinGecko 429 rate limiting

const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  ETH: "ethereum",
  WETH: "ethereum",
  USDC: "usd-coin",
  USDT: "tether",
  MATIC: "matic-network",
  BNB: "binancecoin",
  XCTT: "ethereum", // Test token — pegged 1:1 to ETH for testnet pricing
};

const ADDRESS_TO_SYMBOL: Record<string, string> = {
  "0x0000000000000000000000000000000000000000": "NATIVE",
  "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238": "USDC",
  "0xb2ddc47b08971fab819e0af9ea171223b7408ed6": "XCTT",
  "0x57de85325fb30402aeef473487b43ecacb544dfe": "XCTT",
  "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582": "USDC",
  "0x64544969ed7ebf5f083679233325356ebe738930": "USDC",
  "0xfff9976782d46cc05630d07ae6142005f2dd0291": "WETH",
};

interface PriceCache {
  data: Record<string, number>;
  timestamp: number;
}

// Seed with approximate prices so the app works even when APIs are down
let priceCache: PriceCache | null = {
  data: {
    ethereum: 2500,
    "usd-coin": 1,
    tether: 1,
    "matic-network": 0.5,
    binancecoin: 600,
  },
  timestamp: 0, // expired — will try to refresh on first call, but seed is available as fallback
};

export function resolveSymbol(tokenAddress: string, nativeSymbol: string): string {
  const symbol = ADDRESS_TO_SYMBOL[tokenAddress.toLowerCase()];
  if (symbol === "NATIVE") return nativeSymbol;
  return symbol || "UNKNOWN";
}

export async function fetchUsdPrices(): Promise<Record<string, number>> {
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL_MS) {
    return priceCache.data;
  }

  const ids = Object.values(SYMBOL_TO_COINGECKO_ID).join(",");

  try {
    const response = await fetch(`${COINGECKO_API}?ids=${ids}&vs_currencies=usd`);

    if (!response.ok) {
      console.warn(`CoinGecko API returned ${response.status}`);
      return priceCache?.data || {};
    }

    const json = (await response.json()) as Record<string, { usd: number }>;
    const prices: Record<string, number> = {};

    for (const [id, data] of Object.entries(json)) {
      prices[id] = data.usd;
    }

    priceCache = { data: prices, timestamp: Date.now() };
    return prices;
  } catch (error) {
    console.warn("CoinGecko fetch failed, using cache:", (error as Error).message);
    return priceCache?.data || {};
  }
}

export async function getUsdPrice(symbol: string): Promise<number | null> {
  const geckoId = SYMBOL_TO_COINGECKO_ID[symbol];
  if (!geckoId) return null;

  const prices = await fetchUsdPrices();
  return prices[geckoId] ?? null;
}

export async function getExchangeRateFromUsd(
  fromSymbol: string,
  toSymbol: string
): Promise<number | null> {
  const fromPrice = await getUsdPrice(fromSymbol);
  const toPrice = await getUsdPrice(toSymbol);

  if (!fromPrice || !toPrice || toPrice === 0) return null;

  return fromPrice / toPrice;
}
