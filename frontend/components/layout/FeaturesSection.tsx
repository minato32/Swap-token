"use client";

const features = [
  {
    tag: "Security",
    title: "Battle-tested smart contracts.",
    description:
      "ReentrancyGuard, Pausable, Slippage protection, and 56 automated tests. Audited with Slither static analysis.",
    color: "text-purple-400",
    borderColor: "border-purple-500/20",
    bgColor: "bg-purple-500/5",
  },
  {
    tag: "Bridge",
    title: "LayerZero powered bridging.",
    description:
      "Cross-chain messages delivered in 2-5 minutes with nonce tracking, trusted remote validation, and replay protection.",
    color: "text-blue-400",
    borderColor: "border-blue-500/20",
    bgColor: "bg-blue-500/5",
  },
  {
    tag: "Monitoring",
    title: "Real-time activity surveillance.",
    description:
      "On-chain SecurityMonitor detects large swaps, rapid trading patterns, and suspicious activity with automatic flagging.",
    color: "text-pink-400",
    borderColor: "border-pink-500/20",
    bgColor: "bg-pink-500/5",
  },
  {
    tag: "Governance",
    title: "24-hour timelock on admin changes.",
    description:
      "All critical configuration changes go through a mandatory 24-hour delay, giving the community time to review and react.",
    color: "text-amber-400",
    borderColor: "border-amber-500/20",
    bgColor: "bg-amber-500/5",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 px-4 border-t border-[var(--color-border)]">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--color-text-primary)] text-center mb-3">
          Built for security, designed for speed
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] text-center mb-12 max-w-lg mx-auto">
          Every layer of the protocol is hardened against real-world DeFi attack vectors
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`p-6 rounded-2xl border ${feature.borderColor} ${feature.bgColor} transition-all hover:scale-[1.02]`}
            >
              <span className={`text-xs font-heading font-semibold ${feature.color}`}>
                {feature.tag}
              </span>
              <h3 className="text-lg font-heading font-bold text-[var(--color-text-primary)] mt-2 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
