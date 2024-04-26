"use client";

import { motion } from "framer-motion";

export function Hero3DArt() {
  const tokens = [
    { color: "#8b5cf6", size: 80, x: "15%", y: "20%", delay: 0 },
    { color: "#ec4899", size: 60, x: "75%", y: "15%", delay: 0.3 },
    { color: "#3b82f6", size: 50, x: "85%", y: "55%", delay: 0.6 },
    { color: "#f59e0b", size: 45, x: "10%", y: "65%", delay: 0.9 },
    { color: "#10b981", size: 55, x: "60%", y: "75%", delay: 1.2 },
    { color: "#d0bcff", size: 35, x: "40%", y: "10%", delay: 0.5 },
    { color: "#ffb0cd", size: 40, x: "30%", y: "80%", delay: 0.8 },
  ];

  return (
    <div className="relative w-full h-[600px]">
      {tokens.map((token, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: token.size,
            height: token.size,
            left: token.x,
            top: token.y,
            background: `radial-gradient(circle at 35% 35%, ${token.color}90, ${token.color}30)`,
            boxShadow: `0 0 ${token.size}px ${token.color}40`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [0.8, 1.1, 0.8],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 6 + i,
            repeat: Infinity,
            delay: token.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
