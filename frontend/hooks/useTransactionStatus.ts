"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE_URL, STATUS_POLL_INTERVAL_MS } from "@/lib/constants";
import type { TransactionStatus } from "@/lib/types";

interface StatusResult {
  status: TransactionStatus;
  srcTxHash: string;
  srcChain: string;
  dstChain: string;
  confirmations: number;
  layerZeroScanUrl: string;
}

export function useTransactionStatus(txHash: string | null, srcChain: string, dstChain: string) {
  const [result, setResult] = useState<StatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!txHash) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({ srcChain, dstChain });
      const res = await fetch(`${API_BASE_URL}/status/${txHash}?${params}`);
      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        setError(null);

        if (data.data.status === "DELIVERED" || data.data.status === "FAILED") {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } else {
        setError(data.error || "Failed to fetch status");
      }
    } catch {
      setError("Unable to connect to status service");
    } finally {
      setLoading(false);
    }
  }, [txHash, srcChain, dstChain]);

  useEffect(() => {
    if (!txHash) {
      setResult(null);
      return;
    }

    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, STATUS_POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [txHash, fetchStatus]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  return { result, loading, error, reset };
}
