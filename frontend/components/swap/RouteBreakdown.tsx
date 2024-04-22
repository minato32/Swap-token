"use client";

import { useState } from "react";

interface RouteBreakdownProps {
  fromSymbol: string;
  toSymbol: string;
  fromChain: string;
  toChain: string;
  fee: string;
}

const ROUTE_STEPS = [
  { label: "Source Token", getDetail: (p: RouteBreakdownProps) => p.fromSymbol },
  { label: "SwapRouter", getDetail: () => "0.3% fee" },
  { label: "LayerZero Bridge", getDetail: (p: RouteBreakdownProps) => `${p.fromChain} → ${p.toChain}` },
  { label: "TokenVault", getDetail: () => "Release tokens" },
  { label: "Destination Token", getDetail: (p: RouteBreakdownProps) => p.toSymbol },
];

export function RouteBreakdown(props: RouteBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
        {expanded ? "Hide route" : "Show route"}
      </button>

      {expanded && (
        <div className="mt-3 flex items-center gap-0 overflow-x-auto pb-2">
          {ROUTE_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center min-w-[90px]">
                <div className="w-9 h-9 rounded-full bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-400">{i + 1}</span>
                </div>
                <p className="text-[10px] font-medium text-[var(--color-text-primary)] mt-1.5 text-center">
                  {step.label}
                </p>
                <p className="text-[10px] text-[var(--color-text-secondary)] text-center">
                  {step.getDetail(props)}
                </p>
              </div>

              {i < ROUTE_STEPS.length - 1 && (
                <div className="w-6 h-px bg-primary-500/30 -mt-5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
