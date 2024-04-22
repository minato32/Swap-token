"use client";

import { useState, useEffect, useRef } from "react";
import { API_BASE_URL, QUOTE_DEBOUNCE_MS } from "@/lib/constants";
import type { SwapQuote } from "@/lib/types";

interface UseSwapQuoteParams {
  fromToken: string;
  toToken: string;
  amount: string;
  fromChain: string;
  toChain: string;
}

export function useSwapQuote({ fromToken, toToken, amount, fromChain, toChain }: UseSwapQuoteParams) {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!fromToken || !toToken || !amount || !fromChain || !toChain || parseFloat(amount) <= 0) {
      setQuote(null);
      setError(null);
      return;
    }

    if (fromChain === toChain) {
      setError("Source and destination chains must be different");
      setQuote(null);
      return;
    }

    setLoading(true);
    setError(null);

    timerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          fromToken,
          toToken,
          amount,
          fromChain,
          toChain,
        });

        const res = await fetch(`${API_BASE_URL}/quote?${params}`);
        const data = await res.json();

        if (!data.success) {
          setError(data.error || "Failed to fetch quote");
          setQuote(null);
        } else {
          setQuote(data.data);
          setError(null);
        }
      } catch {
        setError("Unable to connect to quote service");
        setQuote(null);
      } finally {
        setLoading(false);
      }
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fromToken, toToken, amount, fromChain, toChain]);

  return { quote, loading, error };
}
