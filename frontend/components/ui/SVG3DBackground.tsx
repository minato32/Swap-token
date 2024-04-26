"use client";

export function SVG3DBackground() {
  return (
    <div className="fixed inset-0 -z-20 pointer-events-none overflow-hidden">
      <svg
        className="absolute w-full h-full opacity-[0.03]"
        viewBox="0 0 1200 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="bg-glow-1" cx="20%" cy="30%" r="40%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bg-glow-2" cx="80%" cy="70%" r="40%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="900" fill="url(#bg-glow-1)" />
        <rect width="1200" height="900" fill="url(#bg-glow-2)" />
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={i * 75}
            x2="1200"
            y2={i * 75}
            stroke="white"
            strokeOpacity="0.15"
            strokeWidth="0.5"
          />
        ))}
        {Array.from({ length: 16 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 80}
            y1="0"
            x2={i * 80}
            y2="900"
            stroke="white"
            strokeOpacity="0.15"
            strokeWidth="0.5"
          />
        ))}
      </svg>
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[#8b5cf6]/[0.08] rounded-full blur-[150px] -translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#ec4899]/[0.06] rounded-full blur-[150px] translate-x-1/4 translate-y-1/4" />
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-[#3b82f6]/[0.04] rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}
