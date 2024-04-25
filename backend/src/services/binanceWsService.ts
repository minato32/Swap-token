import WebSocket from "ws";

const BINANCE_WS_URL = "wss://stream.binance.com:9443/stream?streams=ethusdt@miniTicker/bnbusdt@miniTicker/maticusdt@miniTicker";
const RECONNECT_DELAY = 5_000;

type PriceCallback = (symbol: string, price: number) => void;

const latestPrices: Record<string, number> = {};
const listeners: PriceCallback[] = [];
let ws: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

const STREAM_TO_SYMBOL: Record<string, string> = {
  ethusdt: "ETH",
  bnbusdt: "BNB",
  maticusdt: "MATIC",
};

function connect() {
  if (ws) return;

  ws = new WebSocket(BINANCE_WS_URL);

  ws.on("open", () => {
    console.log("[Binance WS] Connected, streaming live prices");
  });

  ws.on("message", (raw: WebSocket.Data) => {
    try {
      const msg = JSON.parse(raw.toString());
      const streamName = msg.stream?.replace("@miniTicker", "");
      const symbol = STREAM_TO_SYMBOL[streamName];

      if (symbol && msg.data?.c) {
        const price = parseFloat(msg.data.c);
        latestPrices[symbol] = price;

        for (const cb of listeners) {
          cb(symbol, price);
        }
      }
    } catch {}
  });

  ws.on("close", () => {
    console.log("[Binance WS] Disconnected, reconnecting in 5s...");
    ws = null;
    scheduleReconnect();
  });

  ws.on("error", (err: Error) => {
    console.warn("[Binance WS] Error:", err.message);
    ws?.close();
    ws = null;
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY);
}

export function getLatestPrice(symbol: string): number | null {
  if (symbol === "USDC" || symbol === "USDT") return 1.0;
  return latestPrices[symbol] ?? null;
}

export function getExchangeRate(fromSymbol: string, toSymbol: string): number | null {
  const fromPrice = getLatestPrice(fromSymbol);
  const toPrice = getLatestPrice(toSymbol);
  if (!fromPrice || !toPrice || toPrice === 0) return null;
  return fromPrice / toPrice;
}

export function onPriceUpdate(callback: PriceCallback): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

connect();
