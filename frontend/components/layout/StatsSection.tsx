"use client";

const stats = [
  { label: "Total Volume", value: "$12.4M", description: "All time swap volume" },
  { label: "Total Swaps", value: "48.2K", description: "Cross-chain transactions" },
  { label: "Chains Supported", value: "3", description: "Sepolia, Amoy, BSC" },
  { label: "Avg. Bridge Time", value: "~3 min", description: "LayerZero powered" },
];

export function StatsSection() {
  return (
    <section className="py-20 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--color-text-primary)] leading-tight">
              Cross-chain swaps,{" "}
              <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                simplified.
              </span>
            </h2>
            <p className="mt-4 text-[var(--color-text-secondary)] text-sm leading-relaxed max-w-md">
              Swap tokens across Ethereum, Polygon, and BNB Chain with minimal fees,
              maximum security, and real-time tracking powered by LayerZero protocol.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <p className="text-xs text-[var(--color-text-secondary)] mb-1">{stat.label}</p>
                <p className="text-2xl font-heading font-bold text-[var(--color-text-primary)]">
                  {stat.value}
                </p>
                <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">{stat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
