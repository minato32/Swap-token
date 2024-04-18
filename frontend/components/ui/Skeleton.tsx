"use client";

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: "sm" | "md" | "lg" | "full";
  className?: string;
}

const roundedMap = {
  sm: "rounded-md",
  md: "rounded-xl",
  lg: "rounded-2xl",
  full: "rounded-full",
};

export function Skeleton({
  width = "100%",
  height = "20px",
  rounded = "md",
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse ${roundedMap[rounded]} ${className}`}
      style={{
        width,
        height,
        backgroundColor: "var(--bg-tertiary)",
      }}
    />
  );
}
