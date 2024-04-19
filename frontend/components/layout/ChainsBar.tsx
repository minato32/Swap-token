"use client";

const chains = [
  { name: "Ethereum", symbol: "ETH", color: "bg-blue-500" },
  { name: "Polygon", symbol: "MATIC", color: "bg-purple-500" },
  { name: "BNB Chain", symbol: "BNB", color: "bg-yellow-500" },
];

export function ChainsBar() {
  return (
    <div className="flex items-center justify-center gap-6 py-4 mt-6">
      <span className="text-xs text-[var(--color-text-secondary)]">Supported chains:</span>
      {chains.map((chain) => (
        <div key={chain.name} className="flex items-center gap-1.5">
          <div className={`w-4 h-4 rounded-full ${chain.color}`} />
          <span className="text-xs font-medium text-[var(--color-text-primary)]">
            {chain.name}
          </span>
        </div>
      ))}
    </div>
  );
}
