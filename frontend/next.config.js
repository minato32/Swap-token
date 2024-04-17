/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  experimental: {
    optimizePackageImports: [
      "@rainbow-me/rainbowkit",
      "wagmi",
      "viem",
    ],
  },
};

module.exports = nextConfig;
