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
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const isValid = fromToken && toToken && amount && fromChain && toChain && parseFloat(amount) > 0;

    if (!isValid) {
      setQuote(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams({
        fromToken,
        toToken,
        amount,
        fromChain,
        toChain,
      });

      const url = `${API_BASE_URL}/quote/stream?${params}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SwapQuote;
          setQuote(data);
          setError(null);
          setLoading(false);
        } catch {}
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        fetchOnce(params);
      };
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [fromToken, toToken, amount, fromChain, toChain]);

  async function fetchOnce(params: URLSearchParams) {
    try {
      const res = await fetch(`${API_BASE_URL}/quote?${params}`);
      const data = await res.json();

      if (data.success) {
        setQuote(data.data);
        setError(null);
      } else {
        setError(data.error || "Failed to fetch quote");
        setQuote(null);
      }
    } catch {
      setError("Unable to connect to quote service");
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }

  return { quote, loading, error };
}
